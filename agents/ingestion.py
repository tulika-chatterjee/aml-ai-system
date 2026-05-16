"""Ingestion agent — batch API + optional Kafka hook."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BronzeCustomerKyc, BronzeTransaction


async def ingest_transactions(
    session: AsyncSession,
    rows: list[dict[str, Any]],
) -> list[str]:
    ids: list[str] = []
    now = datetime.now(timezone.utc)
    for r in rows:
        tid = str(uuid4())
        t = BronzeTransaction(
            id=tid,
            external_ref=r.get("external_ref"),
            account_from=r["account_from"],
            account_to=r["account_to"],
            amount=Decimal(str(r["amount"])),
            currency=r.get("currency", "AUD"),
            timestamp_utc=r["timestamp_utc"],
            channel=r.get("channel"),
            raw_payload=r.get("metadata") or {},
            ingested_at=now,
        )
        session.add(t)
        ids.append(tid)
    await session.commit()
    return ids


async def ingest_kyc_batch(session: AsyncSession, rows: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    now = datetime.now(timezone.utc)
    for r in rows:
        kid = str(uuid4())
        existing = await session.scalar(select(BronzeCustomerKyc).where(BronzeCustomerKyc.customer_id == r["customer_id"]))
        if existing:
            existing.full_name = r.get("full_name", existing.full_name)
            existing.pep_flag = bool(r.get("pep_flag", existing.pep_flag))
            existing.risk_tier = r.get("risk_tier", existing.risk_tier)
            existing.country = r.get("country", existing.country)
            existing.narrative = r.get("narrative", existing.narrative)
            existing.raw_payload = r.get("metadata") or existing.raw_payload
            existing.ingested_at = now
            ids.append(existing.id)
        else:
            k = BronzeCustomerKyc(
                id=kid,
                customer_id=r["customer_id"],
                full_name=r["full_name"],
                pep_flag=bool(r.get("pep_flag", False)),
                risk_tier=r.get("risk_tier", "MEDIUM"),
                country=r.get("country", "AU"),
                narrative=r.get("narrative"),
                raw_payload=r.get("metadata") or {},
                ingested_at=now,
            )
            session.add(k)
            ids.append(kid)
    await session.commit()
    return ids


async def fetch_recent_transactions(session: AsyncSession, limit: int = 5000) -> list[BronzeTransaction]:
    q = await session.scalars(select(BronzeTransaction).order_by(BronzeTransaction.timestamp_utc.desc()).limit(limit))
    return list(q.all())
