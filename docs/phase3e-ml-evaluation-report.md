# Phase 3E — AI/ML Anomaly Detection Evaluation & Architecture Report

## 1. Architecture Summary
SmartCompliance implements a **hybrid compliance decision-support architecture**:
- **Deterministic Statutory Engine (`DeterministicRuleEvaluator.java`)**: Evaluates exact statutory thresholds (`POTENTIALLY_MISSING`, `POTENTIALLY_INCOMPLETE`, `POTENTIALLY_DELAYED`) with 100% precision and cross-language golden-file parity verified between Java and Python.
- **Unsupervised Anomaly Detection Microservice (`ml/src/smartcompliance_ml/service.py`)**: A decoupled FastAPI service running `smartcompliance-iforest v1.0.0` (200-tree Isolation Forest + `StandardScaler` + z-score feature attribution) across 17 domain and longitudinal features (MoM payroll delta, MoM headcount delta, quarantine rate, rolling 3-month shortfall/delay indicators).
- **Fail-Open Spring Boot Integration (`MlAnomalyClient.java` & `AnalysisExecutionService.java`)**: Invokes `/predict` during snapshot execution, records `model_name` and `model_version` on `analysis_snapshot`, tags findings as `ML` or `HYBRID` under `category = 'UNUSUAL_PATTERN'`, and fails open gracefully if the ML service is offline.

## 2. Benchmark Results (Employer-Grouped Holdout Test Set)
| Model / Approach | Paradigm | Precision | Recall | F1-Score | ROC-AUC | Batch Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Deterministic Rules (Baseline) | Rule-Based | 1.0000 | 0.6087 | 0.7568 | 0.8043 | 28.48 ms |
| **Isolation Forest (Production)** | **Unsupervised ML** | **0.6250** | **0.8696** | **0.7273** | **0.9623** | **45.48 ms** |
| Local Outlier Factor (LOF) | Unsupervised ML | 0.3846 | 0.6522 | 0.4839 | 0.7804 | 6.68 ms |
| Random Forest (Supervised Ref) | Supervised ML | 0.9524 | 0.8696 | 0.9091 | 0.9967 | 41.42 ms |

- **Key Finding**: Adding unsupervised Isolation Forest detection increases anomaly recall by **+26.1 percentage points** (`60.87%` -> `86.96%`, `0.9623` ROC-AUC) without requiring labeled historical fraud data, capturing subtle longitudinal shifts (e.g., sudden headcount and payroll drops where reported and paid amounts still reconcile to the reduced payroll).

## 3. Governance & Explainability Guardrails
- All ML outputs are framed strictly as **advisory compliance indicators** (`UNUSUAL_PATTERN`) requiring human officer triage and case investigation.
- Every ML finding includes plain-language z-score feature deviations against normal employer-period baselines (e.g., `Month-over-month active headcount change (%) is -0.53 (normal baseline 0.00, 19.5 SD below norm)`).