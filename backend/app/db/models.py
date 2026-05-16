"""Bronze / Silver / Gold style persistence (PostgreSQL).

Layer naming aligns with medallion architecture for AML pipelines.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class BronzeTransaction(Base):
    __tablename__ = "bronze_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    external_ref: Mapped[str | None] = mapped_column(String(64), index=True)
    account_from: Mapped[str] = mapped_column(String(64), index=True)
    account_to: Mapped[str] = mapped_column(String(64), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[str] = mapped_column(String(8), default="AUD")
    timestamp_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    channel: Mapped[str | None] = mapped_column(String(32))
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BronzeCustomerKyc(Base):
    __tablename__ = "bronze_customer_kyc"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(256))
    pep_flag: Mapped[bool] = mapped_column(default=False)
    risk_tier: Mapped[str] = mapped_column(String(16), default="MEDIUM")
    country: Mapped[str] = mapped_column(String(8), default="AU")
    narrative: Mapped[str | None] = mapped_column(Text())
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SilverAccountFeatures(Base):
    __tablename__ = "silver_account_features"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    account_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    window_hours: Mapped[int] = mapped_column(default=24)
    txn_count: Mapped[int] = mapped_column(default=0)
    total_volume: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0"))
    velocity_score: Mapped[float] = mapped_column(default=0.0)
    unique_counterparties: Mapped[int] = mapped_column(default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GoldAlert(Base):
    __tablename__ = "gold_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str | None] = mapped_column(String(64), index=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(16), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(32), default="OPEN")
    hybrid_score: Mapped[float] = mapped_column(default=0.0)
    rule_triggers: Mapped[list[Any]] = mapped_column(JSON, default=list)
    ml_contribution: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    graph_signals: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    austrac_refs: Mapped[list[Any]] = mapped_column(JSON, default=list)
    explanation: Mapped[str | None] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    cases: Mapped[list["GoldCase"]] = relationship(
        back_populates="alert",
        cascade="all, delete-orphan",
    )


class GoldCase(Base):
    __tablename__ = "gold_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    alert_id: Mapped[str] = mapped_column(ForeignKey("gold_alerts.id"), index=True)
    assigned_to: Mapped[str | None] = mapped_column(String(128))
    disposition: Mapped[str | None] = mapped_column(String(64))
    investigator_notes: Mapped[str | None] = mapped_column(Text())
    human_feedback_tags: Mapped[list[Any]] = mapped_column(JSON, default=list)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    alert: Mapped["GoldAlert"] = relationship(back_populates="cases")


class HumanFeedbackAudit(Base):
    __tablename__ = "human_feedback_audit"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String(64), index=True)
    analyst_id: Mapped[str] = mapped_column(String(128))
    verdict: Mapped[str] = mapped_column(String(32))
    comment: Mapped[str | None] = mapped_column(Text())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
