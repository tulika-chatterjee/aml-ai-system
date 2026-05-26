from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from agents.ingestion import ingest_kyc_batch, ingest_transactions
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BronzeCustomerKyc, BronzeTransaction, GoldAlert, GoldCase, HumanFeedbackAudit
from app.db.seed_demo import ensure_demo_alerts
from app.db.session import get_db
from app.mcp.manifest import describe_manifest
from app.services.compliance_chat import synthesize_compliance_reply
from app.services.csv_ingest import parse_customers_csv, parse_transactions_csv
from app.services.scoring_pipeline import run_detection_cycle
from app.simulator.generator import generate_demo_customers, generate_demo_dataset

router = APIRouter(prefix="/api")


class SimulatePayload(BaseModel):
    customers: int = Field(default=40, ge=5, le=500)
    transactions: int = Field(default=800, ge=50, le=50000)
    fraud_ring_size: int = Field(default=8, ge=3, le=50)
    seed: int = 42


class CustomerSeedPayload(BaseModel):
    customers: int = Field(default=80, ge=10, le=5000)
    seed: int = 77


@router.post("/simulate")
async def simulate(payload: SimulatePayload, session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    cust_rows, txn_rows = generate_demo_dataset(
        n_customers=payload.customers,
        n_transactions=payload.transactions,
        fraud_ring_size=payload.fraud_ring_size,
        seed=payload.seed,
    )
    kyc_ids = await ingest_kyc_batch(session, cust_rows)
    txn_ids = await ingest_transactions(session, txn_rows)
    return {"ingested_kyc": len(kyc_ids), "ingested_transactions": len(txn_ids)}


@router.post("/upload/customers")
async def upload_customers_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a .csv file")
    raw = await file.read()
    try:
        rows = parse_customers_csv(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    ids = await ingest_kyc_batch(session, rows)
    return {"ingested_kyc": len(ids), "customer_ids": [r["customer_id"] for r in rows]}


@router.post("/upload/transactions")
async def upload_transactions_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a .csv file")
    raw = await file.read()
    try:
        rows = parse_transactions_csv(raw)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    ids = await ingest_transactions(session, rows)
    return {"ingested_transactions": len(ids)}


@router.post("/customers/seed")
async def seed_customers(payload: CustomerSeedPayload, session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    rows = generate_demo_customers(n_customers=payload.customers, seed=payload.seed)
    ids = await ingest_kyc_batch(session, rows)
    return {"customers_seeded": len(ids)}


@router.get("/customers")
async def list_customers(session: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    # Auto-backfill synthetic database on first read for convenience.
    await ensure_demo_alerts(session)
    q = await session.scalars(select(BronzeCustomerKyc).order_by(BronzeCustomerKyc.customer_id.asc()).limit(5000))
    rows = list(q.all())
    return [
        {
            "customer_id": c.customer_id,
            "full_name": c.full_name,
            "pep_flag": c.pep_flag,
            "risk_tier": c.risk_tier,
            "country": c.country,
            "narrative": c.narrative,
            "ingested_at": c.ingested_at.isoformat(),
        }
        for c in rows
    ]


@router.get("/stats")
async def dashboard_stats(session: AsyncSession = Depends(get_db)) -> dict[str, int]:
    tx_count = await session.scalar(select(func.count()).select_from(BronzeTransaction)) or 0
    cust_count = await session.scalar(select(func.count()).select_from(BronzeCustomerKyc)) or 0
    alert_count = await session.scalar(select(func.count()).select_from(GoldAlert)) or 0
    return {
        "transaction_count": int(tx_count),
        "customer_count": int(cust_count),
        "alert_count": int(alert_count),
    }


@router.post("/detect")
async def detect(session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    await session.execute(delete(GoldCase))
    await session.execute(delete(GoldAlert))
    await session.commit()
    alerts = await run_detection_cycle(session)
    return {"alerts_created": len(alerts), "alert_ids": [a.id for a in alerts]}


@router.get("/alerts")
async def list_alerts(session: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    q = await session.scalars(select(GoldAlert).order_by(GoldAlert.created_at.desc()))
    rows = list(q.all())
    return [
        {
            "id": a.id,
            "account_id": a.account_id,
            "customer_id": a.customer_id,
            "severity": a.severity,
            "status": a.status,
            "hybrid_score": a.hybrid_score,
            "created_at": a.created_at.isoformat(),
            "rule_count": len(a.rule_triggers or []),
        }
        for a in rows
    ]


@router.get("/alerts/{alert_id}")
async def get_alert(alert_id: str, session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    a = await session.get(GoldAlert, alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {
        "id": a.id,
        "account_id": a.account_id,
        "customer_id": a.customer_id,
        "severity": a.severity,
        "status": a.status,
        "hybrid_score": a.hybrid_score,
        "rule_triggers": a.rule_triggers,
        "ml_contribution": a.ml_contribution,
        "graph_signals": a.graph_signals,
        "austrac_refs": a.austrac_refs,
        "explanation": a.explanation,
        "created_at": a.created_at.isoformat(),
    }


class CaseCreate(BaseModel):
    assigned_to: str | None = None


class FileSarPayload(BaseModel):
    case_id: str | None = None
    analyst_id: str = "demo-analyst"
    comment: str | None = None


@router.post("/alerts/{alert_id}/file-sar")
async def file_sar(
    alert_id: str,
    body: FileSarPayload | None = None,
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Mark alert as SAR/SMR filed (demo workflow — not AUSTRAC submission)."""

    alert = await session.get(GoldAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = datetime.now(timezone.utc)
    alert.status = "SAR_FILED"
    alert.updated_at = now

    payload = body or FileSarPayload()
    if payload.case_id:
        session.add(
            HumanFeedbackAudit(
                id=str(uuid4()),
                case_id=payload.case_id,
                analyst_id=payload.analyst_id,
                verdict="sar_filed",
                comment=payload.comment,
                created_at=now,
            )
        )

    await session.commit()
    return {"alert_id": alert.id, "status": alert.status}


@router.post("/alerts/{alert_id}/case")
async def open_case(alert_id: str, body: CaseCreate, session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    alert = await session.get(GoldAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    case = GoldCase(
        id=str(uuid4()),
        alert_id=alert.id,
        assigned_to=body.assigned_to,
        opened_at=datetime.now(timezone.utc),
    )
    session.add(case)
    await session.commit()
    return {"case_id": case.id}


class FeedbackPayload(BaseModel):
    case_id: str
    analyst_id: str
    verdict: str
    comment: str | None = None


@router.post("/feedback")
async def human_feedback(body: FeedbackPayload, session: AsyncSession = Depends(get_db)) -> dict[str, str]:
    fb = HumanFeedbackAudit(
        id=str(uuid4()),
        case_id=body.case_id,
        analyst_id=body.analyst_id,
        verdict=body.verdict,
        comment=body.comment,
        created_at=datetime.now(timezone.utc),
    )
    session.add(fb)
    await session.commit()
    return {"status": "recorded", "feedback_id": fb.id}


class ComplianceChatPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    context: dict[str, Any] | None = None


@router.post("/compliance/chat")
async def compliance_chat(body: ComplianceChatPayload) -> dict[str, Any]:
    """Compliance Agent: lexical RAG over packaged regulatory stubs (demo)."""

    return synthesize_compliance_reply(body.message.strip(), body.context)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/mcp/manifest")
async def mcp_manifest() -> list[dict[str, str]]:
    return describe_manifest()
