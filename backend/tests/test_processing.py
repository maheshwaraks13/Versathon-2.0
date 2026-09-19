"""
Tests for the processing pipeline, extraction service, and explanation service.

Mock objects are used ONLY in test isolation — never in application data.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from schemas import ExtractedReport, ExtractedTest
from services.explanation_service import compute_range_status
from services.export_service import build_json_export, build_text_export


# ── Pydantic schema validation ────────────────────────────────────────────────

def test_extracted_report_valid():
    """Valid AI response structure should parse without errors."""
    data = {
        "report_date": "2024-01-15",
        "tests": [
            {
                "test_name": "Hemoglobin",
                "value": "11.5",
                "unit": "g/dL",
                "reference_range": "12.0 - 16.0",
            }
        ],
    }
    report = ExtractedReport.model_validate(data)
    assert report.report_date == "2024-01-15"
    assert len(report.tests) == 1
    assert report.tests[0].test_name == "Hemoglobin"


def test_extracted_report_null_fields():
    """Missing fields should coerce to None, not raise errors."""
    data = {
        "report_date": None,
        "tests": [
            {"test_name": "TSH", "value": None, "unit": None, "reference_range": None}
        ],
    }
    report = ExtractedReport.model_validate(data)
    assert report.report_date is None
    assert report.tests[0].value is None


def test_extracted_report_numeric_value():
    """Numeric value from AI should be coerced to string."""
    data = {
        "report_date": None,
        "tests": [{"test_name": "Glucose", "value": 95, "unit": "mg/dL", "reference_range": "70 - 100"}],
    }
    report = ExtractedReport.model_validate(data)
    assert report.tests[0].value == "95"  # coerced to string


def test_extracted_report_empty_tests():
    """Empty tests list should be accepted."""
    data = {"report_date": None, "tests": []}
    report = ExtractedReport.model_validate(data)
    assert report.tests == []


def test_extracted_report_null_tests():
    """Null tests should be coerced to empty list."""
    data = {"report_date": None, "tests": None}
    report = ExtractedReport.model_validate(data)
    assert report.tests == []


# ── Reference range status ────────────────────────────────────────────────────

def test_range_status_within():
    assert compute_range_status("11.5", "10.0 - 13.0") == "Within the reference range shown on this report."


def test_range_status_below():
    assert compute_range_status("8.0", "10.0 - 13.0") == "Below the reference range shown on this report."


def test_range_status_above():
    assert compute_range_status("15.0", "10.0 - 13.0") == "Above the reference range shown on this report."


def test_range_status_no_range():
    assert compute_range_status("11.5", None) == "Reference range not provided."


def test_range_status_no_value():
    assert compute_range_status(None, "10.0 - 13.0") == "Reference range not provided."


def test_range_status_less_than():
    """Format: < N."""
    assert compute_range_status("150", "< 200") == "Within the reference range shown on this report."
    assert compute_range_status("250", "< 200") == "Above the reference range shown on this report."


def test_range_status_greater_than():
    """Format: > N."""
    assert compute_range_status("1.5", "> 0.5") == "Within the reference range shown on this report."
    assert compute_range_status("0.3", "> 0.5") == "Below the reference range shown on this report."


# ── Export service ────────────────────────────────────────────────────────────

def _make_mock_report():
    """Build a mock Report object for testing exports."""
    from datetime import datetime
    report = MagicMock()
    report.id = 1
    report.file_name = "test_report.pdf"
    report.report_date = "2024-01-15"
    report.uploaded_at = datetime(2024, 1, 15, 10, 0, 0)
    report.processing_status = "completed"
    return report


def _make_mock_test_result(name="Glucose", value="95", unit="mg/dL", ref="70 - 100"):
    tr = MagicMock()
    tr.test_name = name
    tr.value = value
    tr.unit = unit
    tr.reference_range = ref
    tr.test_date = None
    tr.explanation = f"{name} is a test that measures blood sugar levels."
    return tr


def test_export_json_structure():
    """JSON export should have correct structure with disclaimer."""
    report = _make_mock_report()
    tests = [_make_mock_test_result("Glucose"), _make_mock_test_result("HbA1c", "5.6", "%", "< 5.7")]

    result = build_json_export(report, tests)

    assert "report" in result
    assert "test_results" in result
    assert "disclaimer" in result
    assert "generated_at" in result
    assert len(result["test_results"]) == 2
    assert result["test_results"][0]["test_name"] == "Glucose"
    # Disclaimer must include non-diagnostic language
    assert "does not provide" in result["disclaimer"]


def test_export_text_structure():
    """Text export should contain key information and disclaimer."""
    report = _make_mock_report()
    tests = [_make_mock_test_result("Creatinine", "1.1", "mg/dL", "0.6 - 1.2")]

    result = build_text_export(report, tests)

    assert "Creatinine" in result
    assert "DISCLAIMER" in result
    assert "professional medical advice" in result
    assert "test_report.pdf" in result


def test_export_text_no_tests():
    """Text export with no tests should state no results were extracted."""
    report = _make_mock_report()
    result = build_text_export(report, [])
    assert "No test results were extracted" in result
    assert "DISCLAIMER" in result


# ── Extraction service (mocked AI) ───────────────────────────────────────────

def test_extraction_service_parses_valid_json():
    """
    Extraction service should parse valid AI JSON response and return ExtractedReport.
    AI call is mocked — this test only checks JSON→Pydantic validation.
    """
    mock_response_text = json.dumps({
        "report_date": "2024-03-10",
        "tests": [
            {"test_name": "WBC", "value": "7.5", "unit": "10^3/uL", "reference_range": "4.5 - 11.0"},
            {"test_name": "Platelets", "value": "250", "unit": "10^3/uL", "reference_range": "150 - 400"},
        ],
    })

    mock_response = MagicMock()
    mock_response.text = mock_response_text  # must be a plain string

    mock_model = MagicMock()
    mock_model.models.generate_content.return_value = mock_response

    with patch("services.extraction_service._get_gemini_client", return_value=mock_model):
        from services.extraction_service import extract_medical_data
        result = extract_medical_data("CBC report with WBC 7.5 and Platelets 250")

    assert result is not None
    assert result.report_date == "2024-03-10"
    assert len(result.tests) == 2
    assert result.tests[0].test_name == "WBC"


def test_extraction_service_invalid_json_raises():
    """Extraction service should raise RuntimeError if AI returns invalid JSON."""
    mock_response = MagicMock()
    mock_response.text = "This is not JSON at all."

    mock_model = MagicMock()
    mock_model.models.generate_content.return_value = mock_response

    with patch("services.extraction_service._get_gemini_client", return_value=mock_model):
        from services.extraction_service import extract_medical_data
        with pytest.raises(RuntimeError, match="invalid JSON"):
            extract_medical_data("Some report text")


def test_extraction_service_empty_text():
    """Empty report text should return empty ExtractedReport without calling AI."""
    from services.extraction_service import extract_medical_data

    result = extract_medical_data("")
    assert result is not None
    assert result.tests == []


def test_extraction_service_filters_nameless_tests():
    """Tests with no name should be filtered out."""
    mock_response_text = json.dumps({
        "report_date": None,
        "tests": [
            {"test_name": "Sodium", "value": "140", "unit": "mEq/L", "reference_range": "136 - 145"},
            {"test_name": None, "value": "5.0", "unit": "g/dL", "reference_range": None},
            {"test_name": "", "value": "3.5", "unit": "mg/dL", "reference_range": None},
        ],
    })

    mock_response = MagicMock()
    mock_response.text = mock_response_text

    mock_model = MagicMock()
    mock_model.models.generate_content.return_value = mock_response

    with patch("services.extraction_service._get_gemini_client", return_value=mock_model):
        from services.extraction_service import extract_medical_data
        result = extract_medical_data("Some lab report")

    # Only "Sodium" should survive
    assert len(result.tests) == 1
    assert result.tests[0].test_name == "Sodium"


# ── Document service ──────────────────────────────────────────────────────────

def test_document_service_usable_text_detection():
    """Text with enough characters should be considered usable."""
    from services.document_service import _is_usable_text

    assert _is_usable_text("A" * 100) is True
    assert _is_usable_text("") is False
    assert _is_usable_text("   ") is False
    assert _is_usable_text("AB") is False  # below threshold
