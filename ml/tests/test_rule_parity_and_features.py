import json
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from smartcompliance_ml.features import FEATURE_COLUMNS, build_features
from smartcompliance_ml.rules import RuleInputs, evaluate_rules
from smartcompliance_ml.synthetic import generate_synthetic_observations


def test_python_rules_match_java_golden_vectors():
    fixture_path = Path(__file__).resolve().parent / "fixtures" / "rule_parity_vectors.json"
    vectors = json.loads(fixture_path.read_text(encoding="utf-8"))

    for vec in vectors:
        inp_raw = vec["inputs"]
        inp = RuleInputs(
            employer_id=inp_raw["employerId"],
            period_id=inp_raw["periodId"],
            active_batch_count=inp_raw["activeBatchCount"],
            latest_return_count=inp_raw["latestReturnCount"],
            reported_unknown=inp_raw["reportedUnknown"],
            scope_evidence_incomplete=inp_raw["scopeEvidenceIncomplete"],
            total_expected=Decimal(inp_raw["totalExpected"]),
            total_reported=Decimal(inp_raw["totalReported"]),
            total_paid=Decimal(inp_raw["totalPaid"]),
            max_return_days_late=inp_raw["maxReturnDaysLate"],
            max_payment_days_late=inp_raw["maxPaymentDaysLate"],
        )
        actual = evaluate_rules(inp)
        expected = vec["expected"]
        assert len(actual) == len(expected), f"Mismatch in vector {vec['name']}"
        for act, exp in zip(actual, expected):
            assert act.finding_code == exp["findingCode"]
            assert act.category == exp["category"]
            assert act.priority_score == Decimal(exp["priorityScore"])


def test_synthetic_and_feature_pipeline_has_no_nans():
    raw = generate_synthetic_observations(n_employers=20, n_months=6, seed=7)
    feat = build_features(raw)
    assert len(feat) == 120
    for col in FEATURE_COLUMNS:
        assert col in feat.columns
        assert not feat[col].isna().any(), f"NaN found in feature {col}"