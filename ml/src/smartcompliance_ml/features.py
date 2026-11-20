"""Canonical employer-period observation schema & train-serve-consistent feature builder."""
from __future__ import annotations

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "active_member_count",
    "total_gross_pay",
    "total_expected",
    "avg_pay_per_member",
    "reported_to_expected_ratio",
    "paid_to_expected_ratio",
    "paid_to_reported_ratio",
    "abs_reported_variance_pct",
    "abs_payment_variance_pct",
    "quarantine_rate",
    "return_days_late",
    "payment_days_late",
    "reported_unknown_flag",
    "mom_payroll_delta_pct",
    "mom_headcount_delta_pct",
    "rolling_3m_shortfall_rate",
    "rolling_3m_avg_delay_days",
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform canonical employer-period observations into model-ready features.
    Used identically during offline training/evaluation and live FastAPI scoring
    to eliminate train-serve skew.
    """
    out = df.copy()
    out = out.sort_values(["employer_id", "period_ym"]).reset_index(drop=True)

    members = out["active_member_count"].astype(float).clip(lower=0.0)
    gross = out["total_gross_pay"].astype(float).clip(lower=0.0)
    expected = out["total_expected"].astype(float).clip(lower=0.0)
    reported = out["total_reported"].astype(float).clip(lower=0.0)
    paid = out["total_paid"].astype(float).clip(lower=0.0)
    quarantined = out["quarantined_count"].astype(float).clip(lower=0.0)
    total_rows = (members + quarantined).clip(lower=1.0)

    out["avg_pay_per_member"] = np.where(members > 0, gross / members, 0.0)
    out["reported_to_expected_ratio"] = np.where(expected > 0, reported / expected, 1.0)
    out["paid_to_expected_ratio"] = np.where(expected > 0, paid / expected, 1.0)
    out["paid_to_reported_ratio"] = np.where(reported > 0, paid / reported, np.where(paid == 0, 1.0, 2.0))

    out["abs_reported_variance_pct"] = np.where(expected > 0, np.abs(expected - reported) / expected, 0.0)
    out["abs_payment_variance_pct"] = np.where(expected > 0, np.abs(expected - paid) / expected, 0.0)
    out["quarantine_rate"] = quarantined / total_rows
    out["return_days_late"] = out["return_days_late"].astype(float).clip(lower=0.0)
    out["payment_days_late"] = out["payment_days_late"].astype(float).clip(lower=0.0)
    out["reported_unknown_flag"] = out["reported_unknown"].astype(int)

    # Employer-grouped longitudinal features (month-over-month deltas & rolling 3-month history)
    grp = out.groupby("employer_id", sort=False)
    prev_gross = grp["total_gross_pay"].shift(1).astype(float)
    prev_members = grp["active_member_count"].shift(1).astype(float)

    out["mom_payroll_delta_pct"] = np.where(
        (prev_gross.notna()) & (prev_gross > 0),
        (gross - prev_gross) / prev_gross,
        0.0,
    )
    out["mom_headcount_delta_pct"] = np.where(
        (prev_members.notna()) & (prev_members > 0),
        (members - prev_members) / prev_members,
        0.0,
    )

    shortfall_indicator = ((expected > 0) & ((reported < expected) | (paid < expected))).astype(float)
    out["_shortfall_ind"] = shortfall_indicator
    out["_max_delay"] = np.maximum(out["return_days_late"], out["payment_days_late"])

    out["rolling_3m_shortfall_rate"] = (
        out.groupby("employer_id", sort=False)["_shortfall_ind"]
        .transform(lambda s: s.rolling(3, min_periods=1).mean())
    )
    out["rolling_3m_avg_delay_days"] = (
        out.groupby("employer_id", sort=False)["_max_delay"]
        .transform(lambda s: s.rolling(3, min_periods=1).mean())
    )

    out = out.drop(columns=["_shortfall_ind", "_max_delay"])
    return out