"""Silver-layer feature engineering from bronze transactions."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BronzeTransaction, SilverAccountFeatures


def _window_start(now: datetime, hours: int = 24) -> datetime:
    return now - timedelta(hours=hours)


async def rebuild_silver_features(
    session: AsyncSession,
    window_hours: int | None = 24,
) -> int:
    """Recompute rolling aggregates per account (both directions).

    Pass ``window_hours=None`` to include all bronze transactions (demo fallback).
    """

    now = datetime.now(timezone.utc)
    stmt = select(BronzeTransaction)
    if window_hours is not None:
        start = _window_start(now, window_hours)
        stmt = stmt.where(BronzeTransaction.timestamp_utc >= start)

    q = await session.scalars(stmt)
    recent = list(q.all())

    per_account: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "txn_count": 0,
            "total_volume": Decimal("0"),
            "counterparties": set(),
        }
    )

    for t in recent:
        amt = t.amount
        per_account[t.account_from]["txn_count"] += 1
        per_account[t.account_from]["total_volume"] += amt
        per_account[t.account_from]["counterparties"].add(t.account_to)

        per_account[t.account_to]["txn_count"] += 1
        per_account[t.account_to]["total_volume"] += amt
        per_account[t.account_to]["counterparties"].add(t.account_from)

    await session.execute(delete(SilverAccountFeatures))

    count = 0
    for acc, agg in per_account.items():
        vc = float(agg["txn_count"])
        vol = float(agg["total_volume"])
        velocity_score = vc * (1.0 + min(vol / 50000.0, 3.0))
        sf = SilverAccountFeatures(
            account_id=acc,
            window_hours=window_hours if window_hours is not None else 0,
            txn_count=int(agg["txn_count"]),
            total_volume=agg["total_volume"],
            velocity_score=velocity_score,
            unique_counterparties=len(agg["counterparties"]),
            computed_at=now,
        )
        session.add(sf)
        count += 1

    await session.commit()
    return count
