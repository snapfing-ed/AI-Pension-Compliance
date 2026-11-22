"""Which anomaly types do rules / Isolation Forest / both / neither catch?
Reproduces the split and model of train_and_evaluate.run_benchmark (same seeds)."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from smartcompliance_ml.features import FEATURE_COLUMNS, build_features
from smartcompliance_ml.synthetic import generate_synthetic_observations
from smartcompliance_ml.train_and_evaluate import _rule_baseline_predictions


def main() -> None:
    raw = generate_synthetic_observations(n_employers=120, n_months=12, seed=42)
    feat = build_features(raw)

    employers = feat["employer_id"].unique()
    rng = np.random.default_rng(42)
    rng.shuffle(employers)
    train_emps = set(employers[: int(len(employers) * 0.75)])
    train = feat[feat["employer_id"].isin(train_emps)].reset_index(drop=True)
    test = feat[~feat["employer_id"].isin(train_emps)].reset_index(drop=True)

    scaler = StandardScaler().fit(train[FEATURE_COLUMNS].to_numpy(float))
    iso = IsolationForest(n_estimators=200, contamination=float(train["is_anomaly"].mean()), random_state=42)
    iso.fit(scaler.transform(train[FEATURE_COLUMNS].to_numpy(float)))

    test["rule_flag"] = _rule_baseline_predictions(test)
    test["ml_flag"] = (iso.predict(scaler.transform(test[FEATURE_COLUMNS].to_numpy(float))) == -1).astype(int)
    test["hybrid_flag"] = np.maximum(test["rule_flag"], test["ml_flag"])

    def outcome(r):
        if r.rule_flag and r.ml_flag: return "both"
        if r.rule_flag: return "rules_only"
        if r.ml_flag: return "ml_only"
        return "neither"

    pos = test[test["is_anomaly"] == 1].copy()
    pos["outcome"] = pos.apply(outcome, axis=1)
    print("\n== Anomalous test rows: outcome by anomaly type")
    print(pd.crosstab(pos["anomaly_type"], pos["outcome"], margins=True).to_string())

    neg = test[test["is_anomaly"] == 0]
    print(f"\n== False alerts among {len(neg)} normal test rows")
    print(f"rules: {int(neg['rule_flag'].sum())}   isolation forest: {int(neg['ml_flag'].sum())}   hybrid: {int(neg['hybrid_flag'].sum())}")

    print("\n== Employer-level time to first alert (months after onset; None = never)")
    rows = []
    for emp, g in test.groupby("employer_id"):
        a = g[g["is_anomaly"] == 1]
        if a.empty:
            continue
        onset = a["period_id"].min()
        def first(col, a=a, onset=onset):
            f = a[a[col] == 1]
            return None if f.empty else int(f["period_id"].min() - onset)
        rows.append({"employer_id": emp, "type": a["anomaly_type"].iloc[0], "anomalous_months": len(a),
                     "rules": first("rule_flag"), "iforest": first("ml_flag")})
    print(pd.DataFrame(rows).to_string(index=False))

    print("\n== Employer-level bootstrap 95% intervals (resampling employers, 2000 draws)")
    test["tp_rule"] = ((test["is_anomaly"] == 1) & (test["rule_flag"] == 1)).astype(int)
    test["fp_rule"] = ((test["is_anomaly"] == 0) & (test["rule_flag"] == 1)).astype(int)
    test["tp_ml"] = ((test["is_anomaly"] == 1) & (test["ml_flag"] == 1)).astype(int)
    test["fp_ml"] = ((test["is_anomaly"] == 0) & (test["ml_flag"] == 1)).astype(int)
    per = test.groupby("employer_id").agg(pos=("is_anomaly", "sum"), tp_rule=("tp_rule", "sum"),
                                          fp_rule=("fp_rule", "sum"), tp_ml=("tp_ml", "sum"), fp_ml=("fp_ml", "sum"))
    print(f"anomalous employers in test: {int((per['pos'] > 0).sum())} of {len(per)}")
    brng = np.random.default_rng(0)
    for name, tp, fp in (("rules", "tp_rule", "fp_rule"), ("iforest", "tp_ml", "fp_ml")):
        rec, prec = [], []
        for _ in range(2000):
            s = per.iloc[brng.integers(0, len(per), len(per))].sum()
            if s["pos"] > 0: rec.append(s[tp] / s["pos"])
            if s[tp] + s[fp] > 0: prec.append(s[tp] / (s[tp] + s[fp]))
        r_lo, r_hi = np.percentile(rec, [2.5, 97.5]); p_lo, p_hi = np.percentile(prec, [2.5, 97.5])
        print(f"{name:8s} recall {r_lo:.2f}-{r_hi:.2f}   precision {p_lo:.2f}-{p_hi:.2f}")


if __name__ == "__main__":
    main()
