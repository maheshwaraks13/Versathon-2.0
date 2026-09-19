"""
Tests for report retrieval APIs.

All data is created via the test session — no hardcoded production data.
"""

import pytest
from datetime import datetime, timezone

import models


# ── Fixtures ──────────────────────────────────────────────────────────────────

def create_test_report(db_session, status="completed") -> models.Report:
    """Create a minimal Report record directly in the test DB."""
    report = models.Report(
        file_name="test_blood_report.pdf",
        file_path="/tmp/test_uuid.pdf",
        file_type="pdf",
        report_date="2024-01-15",
        uploaded_at=datetime.now(timezone.utc),
        processing_status=status,
        ocr_text="Sample extracted text",
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    return report


def create_test_result(db_session, report_id: int, test_name: str = "Hemoglobin") -> models.TestResult:
    """Create a minimal TestResult record for a report."""
    result = models.TestResult(
        report_id=report_id,
        test_name=test_name,
        value="11.5",
        unit="g/dL",
        reference_range="12.0 - 16.0",
        explanation="Hemoglobin measures the oxygen-carrying protein in red blood cells.",
    )
    db_session.add(result)
    db_session.commit()
    db_session.refresh(result)
    return result


# ── List reports ──────────────────────────────────────────────────────────────

def test_list_reports_empty(client):
    """GET /api/reports should return empty list when no reports exist."""
    response = client.get("/api/reports")
    assert response.status_code == 200
    assert response.json() == []


def test_list_reports_returns_records(client, db_session):
    """List endpoint should return actual DB records."""
    create_test_report(db_session)
    create_test_report(db_session)

    response = client.get("/api/reports")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert "id" in data[0]
    assert "file_name" in data[0]
    assert "processing_status" in data[0]


def test_list_reports_pagination(client, db_session):
    """Pagination parameters should be respected."""
    for _ in range(5):
        create_test_report(db_session)

    response = client.get("/api/reports?limit=2&skip=0")
    assert response.status_code == 200
    assert len(response.json()) <= 2


# ── Get single report ─────────────────────────────────────────────────────────

def test_get_report_found(client, db_session):
    """GET /api/reports/{id} should return full report detail."""
    report = create_test_report(db_session)
    create_test_result(db_session, report.id)

    response = client.get(f"/api/reports/{report.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == report.id
    assert data["file_name"] == "test_blood_report.pdf"
    assert data["processing_status"] == "completed"
    assert isinstance(data["test_results"], list)
    assert len(data["test_results"]) == 1
    assert data["test_results"][0]["test_name"] == "Hemoglobin"


def test_get_report_not_found(client):
    """GET /api/reports/99999 should return 404."""
    response = client.get("/api/reports/99999")
    assert response.status_code == 404


# ── Get test results ──────────────────────────────────────────────────────────

def test_get_report_tests(client, db_session):
    """GET /api/reports/{id}/tests should return test results."""
    report = create_test_report(db_session)
    create_test_result(db_session, report.id, "Glucose")
    create_test_result(db_session, report.id, "WBC")

    response = client.get(f"/api/reports/{report.id}/tests")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [t["test_name"] for t in data]
    assert "Glucose" in names
    assert "WBC" in names


def test_get_report_tests_not_found(client):
    """Tests endpoint for missing report should return 404."""
    response = client.get("/api/reports/99999/tests")
    assert response.status_code == 404


# ── Comparison / history ──────────────────────────────────────────────────────

def test_compare_test_found(client, db_session):
    """Compare endpoint should return historical values from DB."""
    report1 = create_test_report(db_session)
    report2 = create_test_report(db_session)
    create_test_result(db_session, report1.id, "Hemoglobin")
    create_test_result(db_session, report2.id, "Hemoglobin")

    response = client.get("/api/reports/compare/Hemoglobin")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(d["test_name"] == "Hemoglobin" for d in data)


def test_compare_test_partial_match(client, db_session):
    """Compare endpoint should support partial/case-insensitive matching."""
    report = create_test_report(db_session)
    create_test_result(db_session, report.id, "Fasting Blood Glucose")

    response = client.get("/api/reports/compare/glucose")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_compare_test_not_found(client):
    """Compare with no matching results should return 404."""
    response = client.get("/api/reports/compare/NonExistentTest12345")
    assert response.status_code == 404


# ── Export ────────────────────────────────────────────────────────────────────

def test_export_json(client, db_session):
    """Export as JSON should include report info, tests, and disclaimer."""
    report = create_test_report(db_session)
    create_test_result(db_session, report.id, "Creatinine")

    response = client.get(f"/api/reports/{report.id}/export?format=json")
    assert response.status_code == 200
    data = response.json()
    assert "report" in data
    assert "test_results" in data
    assert "disclaimer" in data
    assert len(data["test_results"]) == 1
    assert data["test_results"][0]["test_name"] == "Creatinine"
    assert "diagnosis" not in data["disclaimer"].lower() or "does not" in data["disclaimer"].lower()


def test_export_text(client, db_session):
    """Export as plain text should contain report info and disclaimer."""
    report = create_test_report(db_session)
    create_test_result(db_session, report.id, "TSH")

    response = client.get(f"/api/reports/{report.id}/export?format=text")
    assert response.status_code == 200
    text = response.text
    assert "TSH" in text
    assert "DISCLAIMER" in text
    assert "medical diagnosis" in text.lower() or "diagnosis" in text.lower()


def test_export_report_not_found(client):
    """Export for missing report should return 404."""
    response = client.get("/api/reports/99999/export")
    assert response.status_code == 404


def test_export_processing_report(client, db_session):
    """Export for an in-progress report should return 400."""
    report = create_test_report(db_session, status="processing")
    response = client.get(f"/api/reports/{report.id}/export")
    assert response.status_code == 400
