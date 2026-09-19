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
      "reference_range": "<reference range string or null>",
      "test_date": "<date of this specific test if explicitly stated, or null>"
    }}
  ]
}}

STRICT RULES — you MUST follow all of these:
1. Extract ONLY information that is explicitly present in the report text.
2. Preserve the original numerical values exactly as they appear.
3. Preserve units exactly as they appear.
4. Preserve reference ranges exactly as they appear.
5. Extract test_date and report_date ONLY if explicitly printed in the text. Never invent dates.
6. Return null for any field that is missing or unclear.
7. Do NOT diagnose any disease or medical condition.
8. Do NOT infer medical conditions from test values.
9. Do NOT invent or guess missing values, units, or reference ranges.
10. Do NOT add commentary, advice, or interpretation.
11. Do NOT recommend any treatment, medication, or lifestyle change.
12. Do NOT claim that any result confirms or suggests a disease.
13. If no tests are found, return an empty tests array.
14. Return ONLY the JSON object — no markdown, no explanation, no code fences.

Medical report text to extract from:
\"\"\"
{report_text}
\"\"\"
"""

# Maximum character size per chunk to avoid LLM context overflow or truncating long documents
CHUNK_SIZE = 8000


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


def _split_into_chunks(text: str, max_chars: int = CHUNK_SIZE) -> list[str]:
    """
    Split text into logical chunks on line boundaries to ensure complete coverage
    of long documents without cutting off in the middle of a line.
    """
    if len(text) <= max_chars:
        return [text]

    chunks = []
    lines = text.splitlines(keepends=True)
    current_chunk = []
    current_len = 0

    for line in lines:
        if current_len + len(line) > max_chars and current_chunk:
            chunks.append("".join(current_chunk).strip())
            current_chunk = [line]
            current_len = len(line)
        else:
            current_chunk.append(line)
            current_len += len(line)

    if current_chunk:
        chunks.append("".join(current_chunk).strip())

    return [c for c in chunks if c]


def _generate_with_fallback(client, prompt: str) -> str:
    """Generate content trying primary model first, then fallback models if 503/404/429 occurs."""
    models_to_try = [settings.AI_MODEL]
    for m in ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-2.5-pro"]:
        if m not in models_to_try:
            models_to_try.append(m)

    last_error = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            if response and response.text:
                return response.text
        except Exception as exc:
            last_error = exc
            logger.warning("Model %s failed: %s. Trying next available model.", model_name, exc)

    raise RuntimeError(f"AI API call failed: {last_error}")


def _extract_single_chunk(chunk_text: str, client) -> ExtractedReport:
    """Extract structured data from a single text chunk."""
    prompt = EXTRACTION_PROMPT.format(report_text=chunk_text)

    try:
        raw_response = _generate_with_fallback(client, prompt)
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
    return extracted


def extract_medical_data(report_text: str) -> Optional[ExtractedReport]:
    """
    Send extracted document text to the AI and return a validated ExtractedReport.
    Supports long documents by chunking and combining results without data loss.

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

    logger.info("AI extraction started (total text length=%d chars)", len(report_text))

    chunks = _split_into_chunks(report_text)
    logger.info("Report split into %d chunk(s) for extraction", len(chunks))

    client = _get_gemini_client()

    final_report_date = None
    all_tests = []
    seen_tests = set()

    for i, chunk in enumerate(chunks):
        logger.info("Processing chunk %d/%d (%d chars)", i + 1, len(chunks), len(chunk))
        chunk_result = _extract_single_chunk(chunk, client)

        if not final_report_date and chunk_result.report_date:
            final_report_date = chunk_result.report_date

        for test in chunk_result.tests:
            # Deduplicate identical tests across overlapping chunks
            key = (
                test.test_name.strip().lower(),
                (test.value or "").strip(),
                (test.unit or "").strip().lower(),
                (test.test_date or "").strip(),
            )
            if key not in seen_tests:
                seen_tests.add(key)
                all_tests.append(test)

    logger.info(
        "AI extraction completed: report_date=%s, total_tests_found=%d",
        final_report_date,
        len(all_tests),
    )

    return ExtractedReport(report_date=final_report_date, tests=all_tests)
