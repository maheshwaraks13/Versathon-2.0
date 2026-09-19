"""
Report processing pipeline.

This module orchestrates the full end-to-end processing of an uploaded medical report:

  uploaded → processing → (text extraction / OCR) → (AI extraction) →
  (Pydantic validation) → (save test results) → (generate explanations) → completed

  Any critical failure → failed  (with error_message stored)

Called after the file has been saved and the Report record created.
"""

import logging

from sqlalchemy.orm import Session

import models
from services import document_service, extraction_service, explanation_service

logger = logging.getLogger(__name__)


def process_report(report_id: int, db: Session) -> None:
    """
    Full processing pipeline for an uploaded medical report.

    Args:
        report_id: Primary key of the Report record to process.
        db: SQLAlchemy session.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        logger.error("process_report: report_id=%d not found", report_id)
        return

    logger.info("Processing started for report_id=%d", report_id)

    # ── Mark as processing ─────────────────────────────────────────────────────
    report.processing_status = "processing"
    db.commit()

    try:
        # ── Phase 1: Text extraction / OCR ────────────────────────────────────
        logger.info("Text extraction started for report_id=%d", report_id)

        try:
            raw_text = document_service.extract_text(
                file_path=report.file_path,
                file_type=report.file_type or "pdf",
            )
        except Exception as exc:
            raise RuntimeError(f"Text extraction failed: {exc}") from exc

        if not raw_text or not raw_text.strip():
            raise RuntimeError(
                "No text could be extracted from the document. "
                "The file may be corrupted, empty, or in an unsupported format."
            )

        logger.info(
            "Text extraction completed for report_id=%d (%d chars)",
            report_id,
            len(raw_text),
        )

        # Save raw extracted text
        report.ocr_text = raw_text
        db.commit()

        # ── Phase 2: AI structured extraction ─────────────────────────────────
        logger.info("AI extraction started for report_id=%d", report_id)

        try:
            extracted = extraction_service.extract_medical_data(raw_text)
        except Exception as exc:
            raise RuntimeError(f"AI extraction failed: {exc}") from exc

        if extracted is None:
            raise RuntimeError("AI extraction returned no data.")

        logger.info(
            "AI extraction completed for report_id=%d: report_date=%s, tests=%d",
            report_id,
            extracted.report_date,
            len(extracted.tests),
        )

        # Update report_date if extracted
        if extracted.report_date:
            report.report_date = extracted.report_date
        db.commit()

        # ── Phase 3: Save test results + generate explanations ────────────────
        logger.info(
            "Saving %d test results for report_id=%d", len(extracted.tests), report_id
        )

        for test in extracted.tests:
            if not test.test_name or not test.test_name.strip():
                logger.warning("Skipping test with no name for report_id=%d", report_id)
                continue

            # Generate patient-friendly explanation
            logger.info("Generating explanation for: %s", test.test_name)
            try:
                explanation = explanation_service.generate_explanation(
                    test_name=test.test_name,
                    value=test.value,
                    unit=test.unit,
                    reference_range=test.reference_range,
                )
            except Exception as exc:
                logger.warning(
                    "Explanation generation failed for %s: %s. Storing None.",
                    test.test_name,
                    exc,
                )
                explanation = None

            test_result = models.TestResult(
                report_id=report_id,
                test_name=test.test_name.strip(),
                value=test.value,
                unit=test.unit,
                reference_range=test.reference_range,
                test_date=test.test_date or extracted.report_date,
                explanation=explanation,
                extraction_confidence=None,  # no reliable confidence from Gemini
            )
            db.add(test_result)

        db.commit()

        # ── Mark as completed ─────────────────────────────────────────────────
        report.processing_status = "completed"
        report.error_message = None
        db.commit()

        logger.info("Processing completed for report_id=%d", report_id)

    except Exception as exc:
        # Any unhandled exception → discard pending objects, clean partial state, mark as failed
        logger.error("Processing failed for report_id=%d: %s", report_id, exc)
        try:
            db.expunge_all()
            # Clean up any partial test results for this report to prevent misleading state
            db.query(models.TestResult).filter(models.TestResult.report_id == report_id).delete()
            report = db.query(models.Report).filter(models.Report.id == report_id).first()
            if report:
                report.processing_status = "failed"
                report.error_message = str(exc)
                db.commit()
        except Exception as db_exc:
            logger.error(
                "Failed to save error status for report_id=%d: %s", report_id, db_exc
            )
        # Do not re-raise — caller already returned 200, failure is stored in DB
