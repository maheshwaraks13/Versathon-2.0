"""
Pydantic schemas for request/response validation and AI extraction validation.

Three layers:
  1. API response schemas (what clients receive)
  2. AI extraction schemas (validate raw LLM JSON)
  3. Internal pipeline schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


# ============================================================
# AI Extraction Schemas  (validate LLM JSON output)
# ============================================================


class ExtractedTest(BaseModel):
    """Single test entry as returned by the AI extraction prompt."""

    test_name: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None

    @field_validator("test_name", mode="before")
    @classmethod
    def test_name_must_not_be_empty(cls, v):
        if v is not None and str(v).strip() == "":
            return None
        return v

    @field_validator("value", mode="before")
    @classmethod
    def coerce_value_to_str(cls, v):
        """Accept numeric values from AI and convert to string."""
        if v is None:
            return None
        return str(v)


class ExtractedReport(BaseModel):
    """Top-level structure returned by the AI extraction service."""

    report_date: Optional[str] = None
    tests: list[ExtractedTest] = []

    @field_validator("tests", mode="before")
    @classmethod
    def ensure_list(cls, v):
        if v is None:
            return []
        return v


# ============================================================
# API Response Schemas
# ============================================================


class TestResultResponse(BaseModel):
    """Single test result returned by the API."""

    id: int
    report_id: int
    test_name: str
    value: Optional[str]
    unit: Optional[str]
    reference_range: Optional[str]
    test_date: Optional[str]
    explanation: Optional[str]
    extraction_confidence: Optional[float]

    model_config = {"from_attributes": True}


class ReportSummary(BaseModel):
    """Lightweight report summary for list endpoints."""

    id: int
    file_name: str
    report_date: Optional[str]
    uploaded_at: datetime
    processing_status: str

    model_config = {"from_attributes": True}


class ReportDetail(BaseModel):
    """Full report detail including all test results."""

    id: int
    file_name: str
    file_type: Optional[str]
    report_date: Optional[str]
    uploaded_at: datetime
    processing_status: str
    error_message: Optional[str]
    test_results: list[TestResultResponse] = []

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    """Response returned immediately after a successful upload."""

    message: str
    report_id: int
    file_name: str
    status: str


class CompareResponse(BaseModel):
    """Single entry in the comparison/history response."""

    report_id: int
    test_name: str
    value: Optional[str]
    unit: Optional[str]
    reference_range: Optional[str]
    test_date: Optional[str]
    report_date: Optional[str]


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str = "1.0.0"
