"""Parse customer and transaction CSV uploads for bronze ingestion."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any


def _parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in ("1", "true", "yes", "y", "t")


def _parse_customer_row(row: dict[str, str]) -> dict[str, Any]:
    cid = (row.get("customer_id") or "").strip()
    name = (row.get("full_name") or "").strip()
    if not cid or not name:
        raise ValueError("customer_id and full_name are required")
    return {
        "customer_id": cid,
        "full_name": name,
        "pep_flag": _parse_bool(row.get("pep_flag")),
        "risk_tier": (row.get("risk_tier") or "MEDIUM").strip().upper(),
        "country": (row.get("country") or "AU").strip(),
        "narrative": (row.get("narrative") or "").strip() or None,
        "metadata": {"source": "csv_upload"},
    }


def _parse_timestamp(raw: str) -> datetime:
    text = raw.strip()
    if not text:
        raise ValueError("timestamp_utc is required")
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    ts = datetime.fromisoformat(text)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc)


def _normalize_tx_timestamp(ts: datetime, row_index: int) -> datetime:
    """Map uploads into the last 7 days so dashboard charts show daily spread."""
    now = datetime.now(timezone.utc)
    if ts >= now - timedelta(days=7):
        return ts
    day_slot = row_index % 7
    minute_slot = (row_index * 17) % (24 * 60)
    start_of_day = (now - timedelta(days=6 - day_slot)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return start_of_day + timedelta(minutes=minute_slot)


def _parse_transaction_row(row: dict[str, str], row_index: int) -> dict[str, Any]:
    af = (row.get("account_from") or "").strip()
    at = (row.get("account_to") or "").strip()
    if not af or not at:
        raise ValueError("account_from and account_to are required")
    amount_raw = (row.get("amount") or "").strip()
    if not amount_raw:
        raise ValueError("amount is required")
    ts = _normalize_tx_timestamp(_parse_timestamp(row.get("timestamp_utc") or ""), row_index)
    return {
        "external_ref": (row.get("external_ref") or "").strip() or None,
        "account_from": af,
        "account_to": at,
        "amount": amount_raw,
        "currency": (row.get("currency") or "AUD").strip(),
        "timestamp_utc": ts,
        "channel": (row.get("channel") or "").strip() or None,
        "metadata": {"source": "csv_upload"},
    }


def parse_customers_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")
    rows = list(reader)
    if not rows:
        raise ValueError("CSV has no data rows")
    return [_parse_customer_row(r) for r in rows]


def parse_transactions_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")
    rows = list(reader)
    if not rows:
        raise ValueError("CSV has no data rows")
    return [_parse_transaction_row(r, i) for i, r in enumerate(rows)]
