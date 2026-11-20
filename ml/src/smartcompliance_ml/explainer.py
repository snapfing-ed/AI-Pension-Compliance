"""Plain-language anomaly explainability via robust z-score deviations against normal baselines."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List
import numpy as np
import pandas as pd

HUMAN_LABELS: Dict[str, str] = {
    "reported_to_expected_ratio": "Reported-to-expected contribution ratio",
    "paid_to_expected_ratio": "Paid-to-expected remittance ratio",
    "paid_to_reported_ratio": "Paid-to-reported settlement ratio",
    "abs_reported_variance_pct": "Absolute reporting variance (%)",
    "abs_payment_variance_pct": "Absolute payment shortfall (%)",
    "quarantine_rate": "Payroll row quarantine rate",
    "return_days_late": "Return submission delay (days)",
    "payment_days_late": "Payment remittance delay (days)",
    "mom_payroll_delta_pct": "Month-over-month gross payroll change (%)",
    "mom_headcount_delta_pct": "Month-over-month active headcount change (%)",
    "rolling_3m_shortfall_rate": "3-month rolling shortfall frequency",
    "rolling_3m_avg_delay_days": "3-month rolling average delay (days)",
    "avg_pay_per_member": "Average pensionable pay per member",
}


@dataclass(frozen=True)
class FeatureContribution:
    feature: str
    label: str
    value: float
    baseline_mean: float
    z_score: float


def fit_baseline_stats(normal_df: pd.DataFrame, feature_cols: List[str]) -> Dict[str, Dict[str, float]]:
    stats: Dict[str, Dict[str, float]] = {}
    for col in feature_cols:
        vals = normal_df[col].astype(float).to_numpy()
        mean = float(np.mean(vals))
        std = float(np.std(vals))
        stats[col] = {"mean": mean, "std": std if std > 1e-6 else 1.0}
    return stats


def explain_row(
    row: pd.Series,
    baseline_stats: Dict[str, Dict[str, float]],
    top_k: int = 3,
) -> tuple[List[FeatureContribution], str]:
    contribs: List[FeatureContribution] = []
    for col, st in baseline_stats.items():
        if col not in HUMAN_LABELS:
            continue
        val = float(row[col])
        z = (val - st["mean"]) / st["std"]
        contribs.append(
            FeatureContribution(
                feature=col,
                label=HUMAN_LABELS[col],
                value=val,
                baseline_mean=st["mean"],
                z_score=z,
            )
        )

    contribs.sort(key=lambda c: abs(c.z_score), reverse=True)
    top = [c for c in contribs[:top_k] if abs(c.z_score) >= 1.25] or contribs[:2]

    parts = []
    for c in top:
        direction = "above" if c.z_score >= 0 else "below"
        parts.append(
            f"{c.label} is {c.value:.2f} (normal baseline {c.baseline_mean:.2f}, {abs(c.z_score):.1f} SD {direction} norm)"
        )
    summary = (
        "Advisory ML indicator: unusual employer-period pattern detected — "
        + "; ".join(parts)
        + ". Requires human compliance review."
    )
    return top, summary