"""Populate bronze + gold layers when the alert queue is empty (dev/demo)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.ingestion import ingest_kyc_batch, ingest_transactions
from app.db.models import BronzeCustomerKyc, BronzeTransaction, GoldAlert, GoldCase
from app.services.scoring_pipeline import run_detection_cycle
from app.simulator.generator import generate_demo_customers, generate_demo_dataset

log = logging.getLogger(__name__)


async def ensure_demo_alerts(session: AsyncSession) -> dict[str, Any]:
    """If `gold_alerts` is empty, ingest demo KYC/transactions (when needed) and run detection."""

    ac = await session.scalar(select(func.count()).select_from(GoldAlert))
    if ac and ac > 0:
        seeded_cases = await _ensure_demo_cases(session)
        log.info("Demo seed skipped: gold_alerts already has %s row(s)", ac)
        return {"seeded": False, "alerts_in_db": int(ac), "cases_created": seeded_cases}

    kyc_count = await session.scalar(select(func.count()).select_from(BronzeCustomerKyc))
    if not kyc_count:
        log.info("Seeding synthetic customer database into bronze_customer_kyc")
        cust_rows = generate_demo_customers(n_customers=80, seed=77)
        await ingest_kyc_batch(session, cust_rows)

    bc = await session.scalar(select(func.count()).select_from(BronzeTransaction))
    if not bc:
        log.info("Seeding bronze layer (demo generator → KYC + transactions)")
        cust_rows, txn_rows = generate_demo_dataset(
            n_customers=40,
            n_transactions=800,
            fraud_ring_size=8,
            seed=42,
        )
        await ingest_kyc_batch(session, cust_rows)
        await ingest_transactions(session, txn_rows)
    else:
        log.info("Bronze data present (%s txns); running detection only", bc)

    log.info("Materialising gold_alerts via detection pipeline")
    alerts = await run_detection_cycle(session)
    await _stamp_sample_sar_statuses(session)
    seeded_cases = await _ensure_demo_cases(session)
    log.info("Demo seed complete: %s alert(s) in gold_alerts", len(alerts))
    return {"seeded": True, "alerts_created": len(alerts), "cases_created": seeded_cases}


async def _stamp_sample_sar_statuses(session: AsyncSession) -> None:
    """Tag a few high-risk alerts as SAR/SMR filed so SAR tab has demo content."""

    q = await session.scalars(
        select(GoldAlert).order_by(GoldAlert.hybrid_score.desc(), GoldAlert.created_at.asc()).limit(3)
    )
    top = list(q.all())
    for a in top:
        a.status = "SAR_FILED"
    await session.commit()


async def _ensure_demo_cases(session: AsyncSession) -> int:
    """Create demo investigation cases if missing (for case tab/reporting)."""

    existing = await session.scalar(select(func.count()).select_from(GoldCase))
    if existing and existing > 0:
        return 0

    q = await session.scalars(select(GoldAlert).order_by(GoldAlert.hybrid_score.desc()).limit(8))
    alerts = list(q.all())
    created = 0
    for a in alerts:
        c = GoldCase(
            id=str(uuid4()),
            alert_id=a.id,
            assigned_to="demo-analyst",
            opened_at=a.created_at,
        )
        session.add(c)
        created += 1
    await session.commit()
    return created
