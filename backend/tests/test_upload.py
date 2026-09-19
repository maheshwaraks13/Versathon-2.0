"""
Tests for the file upload endpoint.

All tests use temporary mock files — no production data is used.
"""

import io
import os
import tempfile

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_pdf_bytes() -> bytes:
    """Minimal valid PDF bytes for testing."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )


def make_small_png_bytes() -> bytes:
    """1x1 white pixel PNG for testing."""
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


from unittest.mock import MagicMock


# ── Upload tests ──────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_background_processing(monkeypatch):
    """In upload unit tests, prevent firing background AI pipeline calls."""
    monkeypatch.setattr("services.processing_pipeline.process_report", MagicMock())


def test_upload_valid_pdf(client, tmp_path, monkeypatch):
    """A valid PDF should be accepted and return report_id."""
    monkeypatch.setattr("config.settings.UPLOAD_DIR", str(tmp_path))
    data = make_pdf_bytes()
    response = client.post(
        "/api/reports/upload",
        files={"file": ("blood_report.pdf", io.BytesIO(data), "application/pdf")},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["report_id"] > 0
    assert body["file_name"] == "blood_report.pdf"
    assert body["status"] == "uploaded"
    assert "message" in body


def test_upload_valid_png(client, tmp_path, monkeypatch):
    """A valid PNG should be accepted."""
    monkeypatch.setattr("config.settings.UPLOAD_DIR", str(tmp_path))
    data = make_small_png_bytes()
    response = client.post(
        "/api/reports/upload",
        files={"file": ("scan.png", io.BytesIO(data), "image/png")},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["report_id"] > 0
    assert body["file_name"] == "scan.png"


def test_upload_valid_jpg(client, tmp_path, monkeypatch):
    """A valid JPEG should be accepted."""
    monkeypatch.setattr("config.settings.UPLOAD_DIR", str(tmp_path))
    jpeg_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 100 + b"\xff\xd9"
    response = client.post(
        "/api/reports/upload",
        files={"file": ("report.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    assert response.status_code == 201, response.text


def test_upload_invalid_extension(client):
    """A .txt file should be rejected with 415."""
    response = client.post(
        "/api/reports/upload",
        files={"file": ("report.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert response.status_code == 415


def test_upload_invalid_extension_exe(client):
    """An .exe file should be rejected."""
    response = client.post(
        "/api/reports/upload",
        files={"file": ("virus.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )
    assert response.status_code == 415


def test_upload_empty_file(client):
    """An empty file should be rejected with 400."""
    response = client.post(
        "/api/reports/upload",
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert response.status_code == 400


def test_upload_creates_db_record(client, db_session, tmp_path, monkeypatch):
    """Upload should create a Report record in the database."""
    import models
    monkeypatch.setattr("config.settings.UPLOAD_DIR", str(tmp_path))

    data = make_pdf_bytes()
    response = client.post(
        "/api/reports/upload",
        files={"file": ("test_report.pdf", io.BytesIO(data), "application/pdf")},
    )
    assert response.status_code == 201
    report_id = response.json()["report_id"]

    db_report = db_session.query(models.Report).filter(
        models.Report.id == report_id
    ).first()
    assert db_report is not None
    assert db_report.file_name == "test_report.pdf"
    assert db_report.processing_status in ("uploaded", "processing", "completed", "failed")


def test_upload_no_file(client):
    """Request with no file should be rejected."""
    response = client.post("/api/reports/upload")
    assert response.status_code == 422  # FastAPI validation error


def test_upload_disguised_file_rejected(client, tmp_path, monkeypatch):
    """A text file disguised with a .pdf extension should be rejected by content signature."""
    monkeypatch.setattr("config.settings.UPLOAD_DIR", str(tmp_path))
    fake_pdf_content = b"This is plain text claiming to be a PDF."
    response = client.post(
        "/api/reports/upload",
        files={"file": ("fake.pdf", io.BytesIO(fake_pdf_content), "application/pdf")},
    )
    assert response.status_code == 400
    assert "PDF format" in response.text
