"""Decoupled FastAPI anomaly scoring service for SmartCompliance (Phase 3E)."""
from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from smartcompliance_ml.explainer import explain_row
from smartcompliance_ml.features import build_features

BUNDLE_PATH = Path(__file__).resolve().parents[2] / "models" / "isolation_forest_v1.joblib"


class ObservationInput(BaseModel):
    employer_id: int
    period_id: int
    period_ym: str = Field(..., examples=["2026-03"])
    active_batch_count: int = 1
    latest_return_count: int = 1
    active_member_count: int = 0
    quarantined_count: int = 0
    total_gross_pay: float = 0.0
    total_expected: float = 0.0
    total_reported: float = 0.0
    total_paid: float = 0.0
    reported_unknown: bool = False
    scope_evidence_incomplete: bool = False
    return_days_late: int = 0
    payment_days_late: int = 0


class PredictRequest(BaseModel):
    target: ObservationInput
    history: List[ObservationInput] = Field(
        default_factory=list,
        description="Optional prior employer-period observations for longitudinal MoM and rolling features.",
    )


class FeatureContributionOut(BaseModel):
    feature: str
    label: str
    value: float
    baseline_mean: float
    z_score: float


class PredictResponse(BaseModel):
    model_name: str
    model_version: str
    is_anomaly: bool
    finding_code: str
    category: str
    priority_score: float
    confidence_score: float
    raw_anomaly_score: float
    explanation: str
    top_features: List[FeatureContributionOut]
    inference_ms: float


app = FastAPI(
    title="SmartCompliance ML Anomaly Detection Service",
    version="1.0.0",
    description="Advisory Isolation Forest anomaly detection with z-score explainability.",
)

_bundle: Optional[dict] = None


def get_bundle() -> dict:
    global _bundle
    if _bundle is None:
        if not BUNDLE_PATH.exists():
            raise HTTPException(status_code=503, detail=f"Model artifact missing at {BUNDLE_PATH}")
        _bundle = joblib.load(BUNDLE_PATH)
    return _bundle


@app.get("/health")
def health() -> dict:
    b = get_bundle()
    return {
        "status": "UP",
        "model_name": b["model_name"],
        "model_version": b["model_version"],
        "feature_count": len(b["feature_columns"]),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    t0 = time.perf_counter()
    b = get_bundle()

    records = [h.model_dump() for h in req.history if h.period_ym != req.target.period_ym]
    target_dict = req.target.model_dump()
    target_dict["_is_target"] = True
    for r in records:
        r["_is_target"] = False
    records.append(target_dict)

    raw_df = pd.DataFrame(records)
    feat_df = build_features(raw_df)
    target_row = feat_df[feat_df["_is_target"]].iloc[0]

    feature_cols = b["feature_columns"]
    X = np.array([[float(target_row[c]) for c in feature_cols]], dtype=float)
    X_scaled = b["scaler"].transform(X)

    model = b["model"]
    pred_label = int(model.predict(X_scaled)[0])
    raw_score = float(-model.score_samples(X_scaled)[0])

    # Normalize raw score into [0.05, 0.99] confidence and [40.0, 98.0] advisory priority
    s_min = float(b["score_min"])
    s_max = float(b["score_max"])
    norm = float(np.clip((raw_score - s_min) / max(s_max - s_min, 1e-6), 0.0, 1.0))

    is_anomaly = pred_label == -1
    confidence = round(0.50 + 0.48 * norm, 5) if is_anomaly else round(max(0.05, 0.45 * norm), 5)
    priority = round(50.0 + 48.0 * norm, 3) if is_anomaly else round(20.0 + 25.0 * norm, 3)

    contribs, explanation = explain_row(target_row, b["baseline_stats"], top_k=3)
    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 3)

    return PredictResponse(
        model_name=b["model_name"],
        model_version=b["model_version"],
        is_anomaly=is_anomaly,
        finding_code="ML_UNUSUAL_CONTRIBUTION_PATTERN",
        category="UNUSUAL_PATTERN",
        priority_score=priority,
        confidence_score=confidence,
        raw_anomaly_score=round(raw_score, 5),
        explanation=explanation,
        top_features=[
            FeatureContributionOut(
                feature=c.feature,
                label=c.label,
                value=round(c.value, 4),
                baseline_mean=round(c.baseline_mean, 4),
                z_score=round(c.z_score, 3),
            )
            for c in contribs
        ],
        inference_ms=elapsed_ms,
    )