"""Train and benchmark candidate anomaly detection models against the deterministic rule baseline."""
from __future__ import annotations

import json
import sys
import time
from decimal import Decimal
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from smartcompliance_ml.explainer import explain_row, fit_baseline_stats
from smartcompliance_ml.features import FEATURE_COLUMNS, build_features
from smartcompliance_ml.rules import RuleInputs, evaluate_rules
from smartcompliance_ml.synthetic import generate_synthetic_observations


def _rule_baseline_predictions(df: pd.DataFrame) -> np.ndarray:
    preds = []
    for _, r in df.iterrows():
        inp = RuleInputs(
            employer_id=int(r["employer_id"]),
            period_id=int(r["period_id"]),
            active_batch_count=int(r["active_batch_count"]),
            latest_return_count=int(r["latest_return_count"]),
            reported_unknown=bool(r["reported_unknown"]),
            scope_evidence_incomplete=bool(r["scope_evidence_incomplete"]),
            total_expected=Decimal(str(r["total_expected"])),
            total_reported=Decimal(str(r["total_reported"])),
            total_paid=Decimal(str(r["total_paid"])),
            max_return_days_late=int(r["return_days_late"]),
            max_payment_days_late=int(r["payment_days_late"]),
        )
        preds.append(1 if len(evaluate_rules(inp)) > 0 else 0)
    return np.array(preds, dtype=int)


def run_benchmark() -> dict:
    raw = generate_synthetic_observations(n_employers=120, n_months=12, seed=42)
    feat_df = build_features(raw)

    # Employer-grouped train/test split (no employer leakage across train and test)
    employers = feat_df["employer_id"].unique()
    rng = np.random.default_rng(42)
    rng.shuffle(employers)
    split_idx = int(len(employers) * 0.75)
    train_emps = set(employers[:split_idx])

    train_df = feat_df[feat_df["employer_id"].isin(train_emps)].reset_index(drop=True)
    test_df = feat_df[~feat_df["employer_id"].isin(train_emps)].reset_index(drop=True)

    X_train = train_df[FEATURE_COLUMNS].to_numpy(dtype=float)
    y_train = train_df["is_anomaly"].to_numpy(dtype=int)
    X_test = test_df[FEATURE_COLUMNS].to_numpy(dtype=float)
    y_test = test_df["is_anomaly"].to_numpy(dtype=int)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    results = []

    # 1. Deterministic Rule Baseline
    t0 = time.perf_counter()
    y_rule = _rule_baseline_predictions(test_df)
    rule_ms = (time.perf_counter() - t0) * 1000.0
    results.append({
        "model": "Deterministic Rules (Baseline)",
        "paradigm": "Rule-Based",
        "precision": round(float(precision_score(y_test, y_rule, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_rule, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_rule, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_rule)), 4),
        "batch_latency_ms": round(rule_ms, 3),
    })

    # 2. Isolation Forest (Unsupervised)
    iso = IsolationForest(
        n_estimators=200,
        contamination=float(np.mean(y_train)),
        random_state=42,
    )
    iso.fit(X_train_scaled)
    t0 = time.perf_counter()
    iso_raw_pred = iso.predict(X_test_scaled)
    iso_scores = -iso.score_samples(X_test_scaled)
    iso_ms = (time.perf_counter() - t0) * 1000.0
    y_iso = (iso_raw_pred == -1).astype(int)
    results.append({
        "model": "Isolation Forest",
        "paradigm": "Unsupervised ML",
        "precision": round(float(precision_score(y_test, y_iso, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_iso, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_iso, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, iso_scores)), 4),
        "batch_latency_ms": round(iso_ms, 3),
    })

    # 3. Local Outlier Factor (Unsupervised Novelty)
    lof = LocalOutlierFactor(
        n_neighbors=20,
        novelty=True,
        contamination=float(np.mean(y_train)),
    )
    lof.fit(X_train_scaled)
    t0 = time.perf_counter()
    lof_raw_pred = lof.predict(X_test_scaled)
    lof_scores = -lof.decision_function(X_test_scaled)
    lof_ms = (time.perf_counter() - t0) * 1000.0
    y_lof = (lof_raw_pred == -1).astype(int)
    results.append({
        "model": "Local Outlier Factor (LOF)",
        "paradigm": "Unsupervised ML",
        "precision": round(float(precision_score(y_test, y_lof, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_lof, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_lof, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, lof_scores)), 4),
        "batch_latency_ms": round(lof_ms, 3),
    })

    # 4. Random Forest Classifier (Supervised Upper-Bound Reference)
    rf = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
    rf.fit(X_train_scaled, y_train)
    t0 = time.perf_counter()
    y_rf = rf.predict(X_test_scaled)
    rf_probs = rf.predict_proba(X_test_scaled)[:, 1]
    rf_ms = (time.perf_counter() - t0) * 1000.0
    results.append({
        "model": "Random Forest (Supervised Ref)",
        "paradigm": "Supervised ML",
        "precision": round(float(precision_score(y_test, y_rf, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_rf, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_rf, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, rf_probs)), 4),
        "batch_latency_ms": round(rf_ms, 3),
    })

    # 5. Hybrid Union (Rules OR Isolation Forest)
    y_hybrid = np.maximum(y_rule, y_iso)
    results.append({
        "model": "Hybrid (Rules + Isolation Forest)",
        "paradigm": "Hybrid Decision Support",
        "precision": round(float(precision_score(y_test, y_hybrid, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_hybrid, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_hybrid, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, np.maximum(y_rule.astype(float), iso_scores))), 4),
        "batch_latency_ms": round(rule_ms + iso_ms, 3),
    })

    # Persist production unsupervised model bundle (Isolation Forest + scaler + baseline stats)
    normal_train = train_df[train_df["is_anomaly"] == 0]
    baseline_stats = fit_baseline_stats(normal_train, FEATURE_COLUMNS)

    # Calibrate score min/max on training set for [0, 1] confidence normalization
    train_raw_scores = -iso.score_samples(X_train_scaled)
    score_min = float(np.percentile(train_raw_scores, 5))
    score_max = float(np.percentile(train_raw_scores, 99))

    models_dir = Path(__file__).resolve().parents[2] / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    bundle_path = models_dir / "isolation_forest_v1.joblib"
    joblib.dump(
        {
            "model_name": "smartcompliance-iforest",
            "model_version": "1.0.0",
            "feature_columns": FEATURE_COLUMNS,
            "scaler": scaler,
            "model": iso,
            "baseline_stats": baseline_stats,
            "score_min": score_min,
            "score_max": score_max,
        },
        bundle_path,
    )

    # Sample plain-language explanation on a detected sudden payroll drop anomaly
    sample_anomalies = test_df[test_df["anomaly_type"] == "SUDDEN_PAYROLL_DROP"]
    sample_explanation = ""
    if not sample_anomalies.empty:
        _, sample_explanation = explain_row(sample_anomalies.iloc[0], baseline_stats)

    report = {
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "test_anomaly_rate": round(float(np.mean(y_test)), 4),
        "benchmark": results,
        "sample_xai_explanation": sample_explanation,
    }
    report_path = models_dir / "benchmark_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n=== Step 3E.3 Model Evaluation Benchmark (Test Set) ===")
    print(pd.DataFrame(results).to_string(index=False))
    print("\n=== Sample Plain-Language XAI Output (Sudden Payroll Drop) ===")
    print(sample_explanation)
    return report


if __name__ == "__main__":
    run_benchmark()