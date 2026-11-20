import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from smartcompliance_ml.service import app

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "UP"
    assert body["model_name"] == "smartcompliance-iforest"
    assert body["feature_count"] == 17


def test_predict_normal_employer_period():
    payload = {
        "history": [
            {
                "employer_id": 50, "period_id": 1, "period_ym": "2026-01",
                "active_member_count": 40, "quarantined_count": 0,
                "total_gross_pay": 400000.0, "total_expected": 40000.0,
                "total_reported": 40000.0, "total_paid": 40000.0
            },
            {
                "employer_id": 50, "period_id": 2, "period_ym": "2026-02",
                "active_member_count": 41, "quarantined_count": 0,
                "total_gross_pay": 410000.0, "total_expected": 41000.0,
                "total_reported": 41000.0, "total_paid": 41000.0
            }
        ],
        "target": {
            "employer_id": 50, "period_id": 3, "period_ym": "2026-03",
            "active_member_count": 40, "quarantined_count": 0,
            "total_gross_pay": 402000.0, "total_expected": 40200.0,
            "total_reported": 40200.0, "total_paid": 40200.0
        }
    }
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_anomaly"] is False
    assert data["category"] == "UNUSUAL_PATTERN"
    assert "Advisory ML indicator" in data["explanation"]


def test_predict_detects_sudden_payroll_drop():
    payload = {
        "history": [
            {
                "employer_id": 51, "period_id": 1, "period_ym": "2026-01",
                "active_member_count": 60, "quarantined_count": 0,
                "total_gross_pay": 600000.0, "total_expected": 60000.0,
                "total_reported": 60000.0, "total_paid": 60000.0
            },
            {
                "employer_id": 51, "period_id": 2, "period_ym": "2026-02",
                "active_member_count": 60, "quarantined_count": 0,
                "total_gross_pay": 600000.0, "total_expected": 60000.0,
                "total_reported": 60000.0, "total_paid": 60000.0
            }
        ],
        "target": {
            "employer_id": 51, "period_id": 3, "period_ym": "2026-03",
            "active_member_count": 24, "quarantined_count": 5,
            "total_gross_pay": 210000.0, "total_expected": 21000.0,
            "total_reported": 21000.0, "total_paid": 21000.0
        }
    }
    resp = client.post("/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_anomaly"] is True
    assert data["finding_code"] == "ML_UNUSUAL_CONTRIBUTION_PATTERN"
    assert data["priority_score"] >= 50.0
    assert len(data["top_features"]) >= 1