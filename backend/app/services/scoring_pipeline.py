"""Orchestrates hybrid risk scoring + alert materialisation."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from agents.compliance import map_rule_hits
from agents.graph_intelligence import GraphIntelService
from agents.ingestion import fetch_recent_transactions
from agents.llm_investigator import synthesize_case_summary
from models.anomaly import BehavioralAnomalyModel, build_feature_row
from models.rule_engine import evaluate_graph, evaluate_kyc, evaluate_velocity
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import BronzeCustomerKyc, GoldAlert, SilverAccountFeatures


async def _customer_for_account(session: AsyncSession, account_id: str) -> BronzeCustomerKyc | None:
    suffix = account_id.split("-")[-1]
    try:
        idx = int(suffix)
    except ValueError:
        idx = 0
    cid = f"CUST-{idx:04d}"
    return await session.scalar(select(BronzeCustomerKyc).where(BronzeCustomerKyc.customer_id == cid))


async def run_detection_cycle(
    session: AsyncSession,
    *,
    accounts_limit: int = 150,
) -> list[GoldAlert]:
    from app.services.feature_compute import rebuild_silver_features

    await rebuild_silver_features(session, window_hours=7 * 24)

    feats = await session.scalars(
        select(SilverAccountFeatures).order_by(SilverAccountFeatures.velocity_score.desc()).limit(500)
    )
    rows = list(feats.all())
    if not rows:
        return []

    X = [
        build_feature_row(
            amount=float(r.total_volume) / max(r.txn_count, 1),
            txn_count_24h=r.txn_count,
            unique_counterparties=r.unique_counterparties,
            velocity_score=r.velocity_score,
            hour_of_day=datetime.now(timezone.utc).hour,
        )
        for r in rows
    ]
    model = BehavioralAnomalyModel()
    model.fit_reference(X)

    recent_tx = await fetch_recent_transactions(session, limit=4000)
    account_latest_tx: dict[str, datetime] = {}
    for t in recent_tx:
        for acc in (t.account_from, t.account_to):
            prev = account_latest_tx.get(acc)
            if prev is None or t.timestamp_utc > prev:
                account_latest_tx[acc] = t.timestamp_utc
    edges_by_account: dict[str, list[tuple[str, str, float]]] = {}
    for t in recent_tx:
        edges_by_account.setdefault(t.account_from, []).append(
            (t.account_from, t.account_to, float(t.amount))
        )
        edges_by_account.setdefault(t.account_to, []).append(
            (t.account_from, t.account_to, float(t.amount))
        )

    settings = get_settings()
    graph_svc = GraphIntelService(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password)

    alerts: list[GoldAlert] = []
    now = datetime.now(timezone.utc)

    for r in rows[:accounts_limit]:
        kyc = await _customer_for_account(session, r.account_id)
        ml_row = build_feature_row(
            amount=float(r.total_volume) / max(r.txn_count, 1),
            txn_count_24h=r.txn_count,
            unique_counterparties=r.unique_counterparties,
            velocity_score=r.velocity_score,
            hour_of_day=now.hour,
        )
        ml_res = model.score_single(ml_row)

        rule_hits = []
        rule_hits.extend(
            evaluate_velocity(
                amount=float(r.total_volume) / max(r.txn_count, 1),
                txn_count_24h=r.txn_count,
                total_vol_24h=r.total_volume,
            )
        )
        if kyc:
            rule_hits.extend(evaluate_kyc(kyc.pep_flag, kyc.risk_tier))

        edges = edges_by_account.get(r.account_id, [])
        g_insight = await graph_svc.analyze_account(r.account_id, edges)
        rule_hits.extend(evaluate_graph(g_insight.cluster_size, g_insight.suspicious_edge_ratio))

        hybrid = min(
            1.0,
            0.35 * (len(rule_hits) / 3.0)
            + 0.45 * float(ml_res.anomaly_score)
            + 0.20 * min(1.0, g_insight.suspicious_edge_ratio),
        )

        if hybrid < 0.35 and not rule_hits:
            continue

        triggers_serialized = [
            {"rule_id": h.rule_id, "description": h.description, "severity": h.severity, "evidence": h.evidence}
            for h in rule_hits
        ]

        ml_payload = {
            "anomaly_score": ml_res.anomaly_score,
            "is_anomaly": ml_res.is_anomaly,
            "features": dict(zip(ml_res.feature_names, ml_res.feature_vector)),
        }
        graph_payload = {
            "focus_account": r.account_id,
            "cluster_size": g_insight.cluster_size,
            "suspicious_edge_ratio": g_insight.suspicious_edge_ratio,
            "source": g_insight.source,
            "node_count": len(g_insight.nodes),
            "sample_edges": [{"from": a, "to": b, **c} for a, b, c in g_insight.edges[:16]],
        }

        rule_ids = [h.rule_id for h in rule_hits]
        austrac_refs = map_rule_hits(rule_ids)

        inv = await synthesize_case_summary(
            account_id=r.account_id,
            triggers=triggers_serialized,
            ml_contribution=ml_payload,
            graph_signals=graph_payload,
        )

        sev = "LOW"
        if any(h.severity == "HIGH" for h in rule_hits) or hybrid >= 0.72:
            sev = "HIGH"
        elif hybrid >= 0.5 or rule_hits:
            sev = "MEDIUM"

        alert_at = account_latest_tx.get(r.account_id, now)
        week_floor = now - timedelta(days=6)
        if alert_at < week_floor:
            slot = sum(ord(c) for c in r.account_id) % (7 * 24)
            alert_at = week_floor + timedelta(hours=slot)

        alert = GoldAlert(
            id=str(uuid4()),
            customer_id=kyc.customer_id if kyc else None,
            account_id=r.account_id,
            severity=sev,
            status="OPEN",
            hybrid_score=float(hybrid),
            rule_triggers=triggers_serialized,
            ml_contribution=ml_payload,
            graph_signals=graph_payload,
            austrac_refs=austrac_refs,
            explanation=inv["explanation_markdown"],
            created_at=alert_at,
            updated_at=now,
        )
        session.add(alert)
        alerts.append(alert)

    await session.commit()
    return alerts
