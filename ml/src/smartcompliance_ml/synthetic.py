"""Generate realistic multi-period employer trajectories in the canonical observation schema."""
from __future__ import annotations

import numpy as np
import pandas as pd


def generate_synthetic_observations(
    n_employers: int = 80,
    n_months: int = 12,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    periods = [f"2025-{m:02d}" for m in range(1, n_months + 1)]

    # Assign employer archetypes: 75% normal compliant, 25% exhibiting specific anomaly patterns
    archetypes = rng.choice(
        [
            "NORMAL",
            "GRADUAL_UNDER_REPORTING",
            "SUDDEN_PAYROLL_DROP",
            "CHRONIC_LATE_REMITTANCE",
            "UNEXPLAINED_OVERPAYMENT",
        ],
        size=n_employers,
        p=[0.72, 0.08, 0.08, 0.07, 0.05],
    )

    for idx in range(n_employers):
        emp_id = 10_000 + idx
        arch = archetypes[idx]
        base_members = int(rng.integers(12, 180))
        base_avg_pay = float(rng.uniform(4500.0, 18500.0))
        anomaly_start = int(rng.integers(5, 9))

        for m_idx, period_ym in enumerate(periods):
            seasonal = 1.0 + rng.normal(0.0, 0.025)
            members = max(1, int(round(base_members * (1.0 + rng.normal(0.0, 0.02)))))
            gross = round(members * base_avg_pay * seasonal, 2)
            # NAPSA 5% employee + 5% employer = 10% statutory total (capped approximation)
            expected = round(gross * 0.10, 2)
            reported = expected
            paid = expected
            quarantined = int(rng.poisson(0.15))
            ret_late = 0
            pay_late = 0
            is_anomaly = 0
            anomaly_type = "NORMAL"

            if arch == "GRADUAL_UNDER_REPORTING" and m_idx >= anomaly_start:
                drift = min(0.45, 0.08 * (m_idx - anomaly_start + 1))
                reported = round(expected * (1.0 - drift), 2)
                paid = reported
                is_anomaly = 1
                anomaly_type = arch

            elif arch == "SUDDEN_PAYROLL_DROP" and m_idx >= anomaly_start:
                # Subtle ghost-worker / abrupt headcount drop without matching cessation notice
                members = max(1, int(round(base_members * 0.48)))
                gross = round(members * base_avg_pay * 0.92, 2)
                expected = round(gross * 0.10, 2)
                reported = expected
                paid = expected
                quarantined = int(rng.integers(2, 7))
                is_anomaly = 1
                anomaly_type = arch

            elif arch == "CHRONIC_LATE_REMITTANCE" and m_idx >= anomaly_start:
                ret_late = int(rng.integers(4, 18))
                pay_late = ret_late + int(rng.integers(2, 12))
                is_anomaly = 1
                anomaly_type = arch

            elif arch == "UNEXPLAINED_OVERPAYMENT" and m_idx == anomaly_start:
                reported = round(expected * 1.38, 2)
                paid = reported
                is_anomaly = 1
                anomaly_type = arch

            rows.append(
                {
                    "origin": "SYNTHETIC",
                    "employer_id": emp_id,
                    "period_id": m_idx + 1,
                    "period_ym": period_ym,
                    "active_batch_count": 1,
                    "latest_return_count": 1,
                    "active_member_count": members,
                    "quarantined_count": quarantined,
                    "total_gross_pay": gross,
                    "total_expected": expected,
                    "total_reported": reported,
                    "total_paid": paid,
                    "reported_unknown": False,
                    "scope_evidence_incomplete": False,
                    "return_days_late": ret_late,
                    "payment_days_late": pay_late,
                    "is_anomaly": is_anomaly,
                    "anomaly_type": anomaly_type,
                }
            )

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate_synthetic_observations()
    df.to_csv("data/synthetic_observations.csv", index=False)
    print(f"Generated {len(df)} rows across {df['employer_id'].nunique()} employers.")
    print(df["anomaly_type"].value_counts().to_string())