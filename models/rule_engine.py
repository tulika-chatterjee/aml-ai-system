"""Hybrid rule engine — explicit triggers for auditability (regulator-friendly)."""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any


@dataclass
class RuleHit:
    rule_id: str
    description: str
    severity: str
    evidence: dict[str, Any] = field(default_factory=dict)


def evaluate_velocity(amount: Decimal, txn_count_24h: int, total_vol_24h: Decimal) -> list[RuleHit]:
    hits: list[RuleHit] = []
    if txn_count_24h >= 15:
        hits.append(
            RuleHit(
                rule_id="AU-RULE-TM-VEL-001",
                description="High transaction frequency within 24h monitoring window",
                severity="MEDIUM",
                evidence={"txn_count_24h": txn_count_24h},
            )
        )
    if total_vol_24h >= Decimal("50000"):
        hits.append(
            RuleHit(
                rule_id="AU-RULE-TM-VOL-002",
                description="Aggregate outbound volume exceeds threshold (risk-based TM)",
                severity="HIGH",
                evidence={"total_vol_24h_aud": str(total_vol_24h)},
            )
        )
    amt = float(amount)
    if amt >= 10_000:
        hits.append(
            RuleHit(
                rule_id="AU-RULE-TCTR-LIKE-003",
                description="Single transaction at or above cash threshold reporting band (monitoring)",
                severity="HIGH",
                evidence={"amount_aud": amt},
            )
        )
    return hits


def evaluate_kyc(pep_flag: bool, risk_tier: str) -> list[RuleHit]:
    hits: list[RuleHit] = []
    if pep_flag:
        hits.append(
            RuleHit(
                rule_id="AU-RULE-CDD-PEP-010",
                description="PEP / enhanced scrutiny — ongoing monitoring elevated",
                severity="HIGH",
                evidence={"pep": True},
            )
        )
    if risk_tier.upper() == "HIGH":
        hits.append(
            RuleHit(
                rule_id="AU-RULE-RBA-HIGH-020",
                description="Risk-based approach: high-risk customer tier",
                severity="MEDIUM",
                evidence={"risk_tier": risk_tier},
            )
        )
    return hits


def evaluate_graph(cluster_size: int, suspicious_edge_ratio: float) -> list[RuleHit]:
    hits: list[RuleHit] = []
    if cluster_size >= 5 and suspicious_edge_ratio >= 0.3:
        hits.append(
            RuleHit(
                rule_id="AU-RULE-NET-LAYER-030",
                description="Structured flow pattern suggestive of layering / mule ring",
                severity="HIGH",
                evidence={"cluster_size": cluster_size, "suspicious_edge_ratio": suspicious_edge_ratio},
            )
        )
    return hits
