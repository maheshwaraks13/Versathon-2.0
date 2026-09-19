"""
API routes for medical report operations.

ROUTE ORDER NOTE:
  GET /api/reports/compare/{test_name} MUST be registered BEFORE
  GET /api/reports/{report_id} to prevent FastAPI matching 'compare' as report_id.

Endpoints:
  POST   /api/reports/upload                  — Upload and process a medical report
  GET    /api/reports                          — List all reports
  GET    /api/reports/compare/{test_name}      — Historical comparison for a test
  GET    /api/reports/{report_id}              — Single report detail
  GET    /api/reports/{report_id}/tests        — Test results for a report
  GET    /api/reports/{report_id}/export       — Export report as JSON or text
  DELETE /api/reports/{report_id}              — Delete a report (optional)
"""

import logging
import threading
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
)
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services import file_service, processing_pipeline
from services.export_service import build_json_export, build_text_export

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Reports"])


# ============================================================
# POST /api/reports/upload
# ============================================================

@router.post(
    "/upload",
    response_model=schemas.UploadResponse,
    status_code=201,
    summary="Upload a medical report",
    description=(
        "Upload a PDF, JPG, JPEG, or PNG medical report. "
        "The file is validated, stored securely, a database record is created, "
        "and processing begins in the background. "
        "Poll GET /api/reports/{report_id} to check processing_status."
    ),
    responses={
        400: {"description": "Empty file or invalid request"},
        413: {"description": "File too large"},
        415: {"description": "Unsupported file type"},
        500: {"description": "Internal server error"},
    },
)
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Medical report file (PDF/JPG/JPEG/PNG)"),
    db: Session = Depends(get_db),
):
    """
    Upload a medical report and trigger background processing.

    Returns immediately with report_id and status='uploaded'.
    Processing (OCR, AI extraction) runs in the background.
    """
    # Step 1: Validate file type/extension
    file_service.validate_file(file)

    # Step 2: Save file securely
    try:
        original_filename, storage_path, ext = await file_service.save_upload(file)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("File save error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # Step 3: Determine MIME type label
    mime_label = file.content_type or f"application/{ext}"

    # Step 4: Create report record with status = uploaded
    report = models.Report(
        file_name=original_filename,
        file_path=storage_path,
        file_type=ext,
        processing_status="uploaded",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    logger.info(
        "Report record created: report_id=%d file=%s", report.id, original_filename
    )

    # Step 5: Trigger processing pipeline in background
    # We use BackgroundTasks but also need a fresh DB session inside the thread
    from database import SessionLocal

    def run_pipeline(report_id: int):
        session = SessionLocal()
        try:
            processing_pipeline.process_report(report_id, session)
        finally:
            session.close()

    background_tasks.add_task(run_pipeline, report.id)

    return schemas.UploadResponse(
        message="Report uploaded successfully. Processing has started.",
        report_id=report.id,
        file_name=original_filename,
        status="uploaded",
    )


# ============================================================
# GET /api/reports
# ============================================================

@router.get(
    "",
    response_model=list[schemas.ReportSummary],
    summary="List all uploaded reports",
    description="Returns a list of all uploaded reports ordered by most recent first. Data is fetched from the database.",
)
def list_reports(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
    db: Session = Depends(get_db),
):
    """List all reports, newest first. Supports pagination via skip/limit."""
    reports = (
        db.query(models.Report)
        .order_by(models.Report.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return reports


# ============================================================
# GET /api/reports/compare/{test_name}
# IMPORTANT: must be declared BEFORE /{report_id}
# ============================================================

@router.get(
    "/compare/{test_name}",
    response_model=list[schemas.CompareResponse],
    summary="Historical comparison for a test name",
    description=(
        "Returns all historical values for a given test name across all uploaded reports. "
        "Useful for tracking trends over time. Results are sorted chronologically. "
        "All data comes from the database — no invented values."
    ),
    responses={
        404: {"description": "No results found for this test name"},
    },
)
def compare_test(
    test_name: str,
    db: Session = Depends(get_db),
):
    """
    Query historical values for a specific test across all reports.

    Test name matching is case-insensitive and partial.
    Returns chronologically sorted results.
    """
    results = (
        db.query(models.TestResult, models.Report)
        .join(models.Report, models.TestResult.report_id == models.Report.id)
        .filter(
            models.TestResult.test_name.ilike(f"%{test_name}%"),
            models.Report.processing_status == "completed",
        )
        .order_by(models.Report.report_date.asc(), models.Report.uploaded_at.asc())
        .all()
    )

    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No results found for test: '{test_name}'. "
                   "Ensure the test name matches what was extracted from uploaded reports.",
        )

    return [
        schemas.CompareResponse(
            report_id=report.id,
            test_name=tr.test_name,
            value=tr.value,
            unit=tr.unit,
            reference_range=tr.reference_range,
            test_date=tr.test_date,
            report_date=report.report_date,
        )
        for tr, report in results
    ]


# ============================================================
# GET /api/reports/{report_id}
# ============================================================

@router.get(
    "/{report_id}",
    response_model=schemas.ReportDetail,
    summary="Get a single report with all test results",
    responses={
        404: {"description": "Report not found"},
    },
)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    """
    Return full details of a single report including all extracted test results
    and patient-friendly explanations.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return report


# ============================================================
# GET /api/reports/{report_id}/tests
# ============================================================

@router.get(
    "/{report_id}/tests",
    response_model=list[schemas.TestResultResponse],
    summary="Get test results for a report",
    responses={
        404: {"description": "Report not found"},
    },
)
def get_report_tests(
    report_id: int,
    db: Session = Depends(get_db),
):
    """Return only the test results associated with the specified report."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    return report.test_results


# ============================================================
# GET /api/reports/{report_id}/export
# ============================================================

@router.get(
    "/{report_id}/export",
    summary="Export a report",
    description=(
        "Export a report and its test results. "
        "Use format=json for structured JSON output or format=text for plain text. "
        "All data comes from the database. Includes the required medical disclaimer."
    ),
    responses={
        404: {"description": "Report not found"},
        400: {"description": "Report not yet completed"},
    },
)
def export_report(
    report_id: int,
    format: str = Query("json", pattern="^(json|text)$", description="Export format: 'json' or 'text'"),
    db: Session = Depends(get_db),
):
    """
    Export a completed report in JSON or plain-text format.
    Includes the required medical disclaimer in both formats.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    if report.processing_status not in ("completed", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"Report is still being processed (status: {report.processing_status}). Try again shortly.",
        )

    test_results = report.test_results

    if format == "text":
        text_content = build_text_export(report, test_results)
        return PlainTextResponse(
            content=text_content,
            headers={
                "Content-Disposition": f'attachment; filename="report_{report_id}.txt"'
            },
        )
    else:
        return build_json_export(report, test_results)


# ============================================================
# DELETE /api/reports/{report_id}  (optional)
# ============================================================

@router.delete(
    "/{report_id}",
    status_code=204,
    summary="Delete a report",
    description="Delete a report and all its associated test results from the database. The uploaded file is also removed.",
    responses={
        404: {"description": "Report not found"},
    },
)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    """Delete a report, its test results, and the uploaded file."""
    import os

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    # Remove the physical file
    try:
        if report.file_path and os.path.exists(report.file_path):
            os.remove(report.file_path)
            logger.info("Deleted file: %s", report.file_path)
    except Exception as exc:
        logger.warning("Could not delete file for report_id=%d: %s", report_id, exc)

    db.delete(report)  # cascade deletes test_results
    db.commit()

    logger.info("Deleted report_id=%d", report_id)
    return None
