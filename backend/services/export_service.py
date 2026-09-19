"""
Export service.

Builds a structured plain-text / JSON export of a report and its test results.
All data comes from the database — no fabricated values.

The required medical disclaimer is always appended.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "\n"
    "─" * 60 + "\n"
    "DISCLAIMER\n"
    "─" * 60 + "\n"
    "This tool provides simplified explanations of information found in\n"
    "medical reports. It does not provide a medical diagnosis, treatment\n"
    "recommendation, or substitute for professional medical advice.\n"
    "Always consult a qualified healthcare professional with any questions\n"
    "regarding your health or a medical condition.\n"
    "─" * 60
)


def build_text_export(report, test_results: list) -> str:
    """
    Build a plain-text export of a report.

    Args:
        report: Report SQLAlchemy model instance.
        test_results: List of TestResult SQLAlchemy model instances.

    Returns:
        Formatted string ready for download.
    """
    logger.info("Building text export for report_id=%d", report.id)

    lines = [
        "=" * 60,
        "MEDICAL REPORT SIMPLIFIED SUMMARY",
        "=" * 60,
        f"Report ID      : {report.id}",
        f"File           : {report.file_name}",
        f"Report Date    : {report.report_date or 'Not found in report'}",
        f"Uploaded At    : {report.uploaded_at.strftime('%Y-%m-%d %H:%M:%S UTC') if report.uploaded_at else 'N/A'}",
        f"Status         : {report.processing_status}",
        "",
        "─" * 60,
        "TEST RESULTS",
        "─" * 60,
    ]

    if not test_results:
        lines.append("No test results were extracted from this report.")
    else:
        for i, tr in enumerate(test_results, 1):
            lines.append(f"\n[{i}] {tr.test_name}")
            lines.append(f"    Value          : {tr.value or 'N/A'} {tr.unit or ''}".rstrip())
            lines.append(f"    Reference Range: {tr.reference_range or 'Not provided'}")
            if tr.test_date:
                lines.append(f"    Test Date      : {tr.test_date}")
            if tr.explanation:
                lines.append(f"    Explanation    : {tr.explanation}")

    lines.append(DISCLAIMER)
    lines.append(f"\nGenerated at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")

    return "\n".join(lines)


def build_json_export(report, test_results: list) -> dict:
    """
    Build a structured JSON export of a report.

    Args:
        report: Report SQLAlchemy model instance.
        test_results: List of TestResult SQLAlchemy model instances.

    Returns:
        Dictionary suitable for JSON serialization.
    """
    logger.info("Building JSON export for report_id=%d", report.id)

    return {
        "report": {
            "id": report.id,
            "file_name": report.file_name,
            "report_date": report.report_date,
            "uploaded_at": report.uploaded_at.isoformat() if report.uploaded_at else None,
            "processing_status": report.processing_status,
        },
        "test_results": [
            {
                "test_name": tr.test_name,
                "value": tr.value,
                "unit": tr.unit,
                "reference_range": tr.reference_range,
                "test_date": tr.test_date,
                "explanation": tr.explanation,
            }
            for tr in test_results
        ],
        "disclaimer": (
            "This tool provides simplified explanations of information found in "
            "medical reports. It does not provide a medical diagnosis, treatment "
            "recommendation, or substitute for professional medical advice. "
            "Always consult a qualified healthcare professional."
        ),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
