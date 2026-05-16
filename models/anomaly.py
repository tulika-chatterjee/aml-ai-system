"""Behavioral / ML scoring — complements rules; outputs interpretable features."""

from dataclasses import dataclass
from math import cos, log1p, pi, sin


@dataclass
class MLScoreResult:
    anomaly_score: float
    is_anomaly: bool
    feature_vector: list[float]
    feature_names: list[str]


_FEATURE_NAMES = [
    "log_amount",
    "txn_count_24h",
    "unique_counterparties_24h",
    "velocity_score",
    "hour_sin",
    "hour_cos",
]


class BehavioralAnomalyModel:
    """Heuristic behavioural scorer (dependency-light for local demos)."""

    def __init__(self, contamination: float = 0.08, random_state: int = 42) -> None:
        self._fitted = False

    def fit_reference(self, X: list[list[float]]) -> None:
        self._fitted = len(X) >= 5

    def score_single(self, row: list[float]) -> MLScoreResult:
        if not self._fitted:
            return MLScoreResult(
                anomaly_score=0.0,
                is_anomaly=False,
                feature_vector=row,
                feature_names=_FEATURE_NAMES,
            )
        _, txn_count, counterparties, velocity, _, _ = row
        score = min(1.0, max(0.0, (txn_count / 30.0) * 0.35 + (counterparties / 25.0) * 0.2 + (velocity / 120.0) * 0.45))
        return MLScoreResult(
            anomaly_score=score,
            is_anomaly=score >= 0.62,
            feature_vector=row,
            feature_names=_FEATURE_NAMES,
        )


def build_feature_row(
    *,
    amount: float,
    txn_count_24h: int,
    unique_counterparties: int,
    velocity_score: float,
    hour_of_day: int,
) -> list[float]:
    h = hour_of_day % 24
    return [
        log1p(max(amount, 0.0)),
        float(txn_count_24h),
        float(unique_counterparties),
        float(velocity_score),
        sin(2 * pi * h / 24),
        cos(2 * pi * h / 24),
    ]
