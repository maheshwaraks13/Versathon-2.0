"""
AI extraction service.

Sends the raw extracted document text to Google Gemini and receives
structured JSON describing the medical tests found in the report.

Rules enforced by prompt:
  - Extract ONLY information explicitly present in the document.
  - Preserve numerical values and units exactly.
  - Return null for any field that is missing or unclear.
  - Do NOT diagnose. Do NOT infer. Do NOT invent values.
  - Do NOT recommend treatment or medication.

AI response is validated through Pydantic before any data is saved.
"""

import json
import logging
import re
from typing import Optional

from config import settings
from schemas import ExtractedReport

logger = logging.getLogger(__name__)

# ── Strict extraction prompt ───────────────────────────────────────────────────

EXTRACTION_PROMPT = """You are a medical-report information extraction assistant.

Your ONLY task is to extract information that is explicitly and literally present in the provided medical report text.

Return a single valid JSON object with this exact structure:
{{
  "report_date": "<date string or null>",
  "tests": [
    {{
      "test_name": "<name of the test>",
      "value": "<reported value as a string>",
      "unit": "<unit string or null>",
      "reference_range": "<reference range string or null>"
    }}
  ]
}}

STRICT RULES — you MUST follow all of these:
1. Extract ONLY information that is explicitly present in the report text.
2. Preserve the original numerical values exactly as they appear.
3. Preserve units exactly as they appear.
4. Preserve reference ranges exactly as they appear.
5. Return null for any field that is missing or unclear.
6. Do NOT diagnose any disease or medical condition.
7. Do NOT infer medical conditions from test values.
8. Do NOT invent or guess missing values, units, or reference ranges.
9. Do NOT add commentary, advice, or interpretation.
10. Do NOT recommend any treatment, medication, or lifestyle change.
11. Do NOT claim that any result confirms or suggests a disease.
12. If no tests are found, return an empty tests array.
13. Return ONLY the JSON object — no markdown, no explanation, no code fences.

Medical report text to extract from:
\"\"\"
{report_text}
\"\"\"
"""


def _get_gemini_client():
    """Initialize and return the Gemini client using google-genai SDK."""
    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError(
            "google-genai is not installed. Run: pip install google-genai"
        ) from exc

    if not settings.AI_API_KEY:
        raise RuntimeError(
            "AI_API_KEY is not set. Add it to your .env file."
        )

    client = genai.Client(api_key=settings.AI_API_KEY)
    return client


def _clean_ai_response(raw: str) -> str:
    """
    Strip markdown code fences or any surrounding text from AI JSON response.
    Returns the innermost JSON object string.
    """
    # Remove ```json ... ``` or ``` ... ``` fences
    cleaned = re.sub(r"```(?:json)?\s*", "", raw)
    cleaned = re.sub(r"```", "", cleaned)

    # Try to locate a JSON object
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]

    return cleaned.strip()


def extract_medical_data(report_text: str) -> Optional[ExtractedReport]:
    """
    Send extracted document text to the AI and return a validated ExtractedReport.

    Args:
        report_text: Raw text extracted from the uploaded medical document.

    Returns:
        ExtractedReport on success, or None if extraction/validation fails.

    Raises:
        RuntimeError: If the AI API call fails entirely.
    """
    if not report_text or not report_text.strip():
        logger.warning("AI extraction called with empty report text.")
        return ExtractedReport(report_date=None, tests=[])

    logger.info("AI extraction started (text length=%d chars)", len(report_text))

    client = _get_gemini_client()
    prompt = EXTRACTION_PROMPT.format(report_text=report_text[:12000])  # hard cap

    try:
        response = client.models.generate_content(
            model=settings.AI_MODEL,
            contents=prompt,
        )
        raw_response = response.text
        logger.info(
            "AI extraction response received (length=%d chars)", len(raw_response)
        )
    except Exception as exc:
        logger.error("AI API call failed: %s", exc)
        raise RuntimeError(f"AI API call failed: {exc}") from exc

    # Parse JSON
    try:
        cleaned = _clean_ai_response(raw_response)
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("AI response is not valid JSON: %s\nRaw: %s", exc, raw_response[:500])
        raise RuntimeError(f"AI returned invalid JSON: {exc}") from exc

    # Pydantic validation
    try:
        extracted = ExtractedReport.model_validate(data)
    except Exception as exc:
        logger.error("Pydantic validation of AI response failed: %s", exc)
        raise RuntimeError(f"AI response failed Pydantic validation: {exc}") from exc

    # Business validation: filter out entries with no test name
    valid_tests = [t for t in extracted.tests if t.test_name and t.test_name.strip()]
    extracted.tests = valid_tests

    logger.info(
        "AI extraction completed: report_date=%s, tests_found=%d",
        extracted.report_date,
        len(extracted.tests),
    )

    return extracted
