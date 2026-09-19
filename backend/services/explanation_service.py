"""
Explanation service.

Generates short, patient-friendly explanations for each extracted test result.

Rules:
  - Explain what the test generally measures.
  - Describe the reported value relative to the reference range from THIS report.
  - Do NOT diagnose any disease.
  - Do NOT recommend treatment or medication.
  - Do NOT claim abnormal results confirm a disease.
  - Do NOT invent reference ranges.
  - Use neutral, accessible language.
"""

import logging
import re
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)

# Patterns that violate non-diagnostic / non-prescriptive safety rules
UNSAFE_EXPLANATION_PATTERNS = [
    re.compile(r"\byou have\b", re.IGNORECASE),
    re.compile(r"\byou suffer from\b", re.IGNORECASE),
    re.compile(r"\bdiagnosed with\b", re.IGNORECASE),
    re.compile(r"\bdiagnosis\b", re.IGNORECASE),
    re.compile(r"\bprescrib", re.IGNORECASE),
    re.compile(r"\bmedication\b", re.IGNORECASE),
    re.compile(r"\byou should take\b", re.IGNORECASE),
    re.compile(r"\btreatment plan\b", re.IGNORECASE),
    re.compile(r"\brecommend(?:ed)? treatment\b", re.IGNORECASE),
    re.compile(r"\bconfirms? (?:that )?you have\b", re.IGNORECASE),
    re.compile(r"\bindicates? (?:that )?you have\b", re.IGNORECASE),
]


def is_safe_explanation(text: str) -> bool:
    """
    Validate that an AI-generated explanation contains no diagnostic claims,
    prescriptions, or treatment recommendations.
    """
    if not text or not text.strip():
        return False

    for pattern in UNSAFE_EXPLANATION_PATTERNS:
        if pattern.search(text):
            logger.warning(
                "Unsafe content detected in AI explanation (matched '%s').",
                pattern.pattern,
            )
            return False

    return True


# ── Reference range status ─────────────────────────────────────────────────────

def _parse_range(reference_range: str) -> Optional[tuple[float, float]]:
    """
    Attempt to parse a reference range string into (low, high) floats.
    Handles formats like '4.0 - 11.0', '70-99', '< 200', '> 0.5'.
    Returns None if parsing is not possible.
    """
    import re

    if not reference_range:
        return None

    # Format: low - high
    m = re.search(r"(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)", reference_range)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass

    # Format: < N
    m = re.search(r"<\s*(\d+\.?\d*)", reference_range)
    if m:
        try:
            return None, float(m.group(1))  # (no low bound, high bound)
        except ValueError:
            pass

    # Format: > N
    m = re.search(r">\s*(\d+\.?\d*)", reference_range)
    if m:
        try:
            return float(m.group(1)), None  # (low bound, no high bound)
        except ValueError:
            pass

    return None


def compute_range_status(value: Optional[str], reference_range: Optional[str]) -> str:
    """
    Compare a value against the report's own reference range.

    Returns one of:
      - "Below the reference range shown on this report."
      - "Within the reference range shown on this report."
      - "Above the reference range shown on this report."
      - "Reference range not provided."

    Never invents a reference range. Never diagnoses.
    """
    if not reference_range or not reference_range.strip():
        return "Reference range not provided."

    if not value or not value.strip():
        return "Reference range not provided."

    # Try to parse the value as a number
    try:
        import re
        numeric_match = re.search(r"\d+\.?\d*", value)
        if not numeric_match:
            return "Reference range not provided."
        numeric_value = float(numeric_match.group())
    except ValueError:
        return "Reference range not provided."

    bounds = _parse_range(reference_range)
    if bounds is None:
        return "Reference range not provided."

    low, high = bounds

    if low is None and high is not None:
        # Format: < N
        if numeric_value < high:
            return "Within the reference range shown on this report."
        else:
            return "Above the reference range shown on this report."

    if low is not None and high is None:
        # Format: > N
        if numeric_value > low:
            return "Within the reference range shown on this report."
        else:
            return "Below the reference range shown on this report."

    if low is not None and high is not None:
        if numeric_value < low:
            return "Below the reference range shown on this report."
        elif numeric_value > high:
            return "Above the reference range shown on this report."
        else:
            return "Within the reference range shown on this report."

    return "Reference range not provided."


# ── AI explanation generation ──────────────────────────────────────────────────

EXPLANATION_PROMPT = """You are a patient-education assistant for a medical report simplifier tool.

Write a short, clear, friendly explanation for the following test result.
The explanation should cover:
1. What this test generally measures (one sentence).
2. What the reported value means relative to the reference range shown on this report (one sentence, using only the range provided — do not use external knowledge to invent ranges).

STRICT RULES:
- Do NOT diagnose any disease or medical condition.
- Do NOT suggest or recommend any treatment or medication.
- Do NOT claim that this result confirms or suggests a specific disease.
- Do NOT invent a reference range if none is provided.
- Use plain language that a non-medical person can understand.
- Keep the explanation to 2-3 sentences maximum.
- If no reference range is provided, state that one was not included in the report.

Test information:
- Test name: {test_name}
- Reported value: {value} {unit}
- Reference range from this report: {reference_range}
- Status: {range_status}

Write only the explanation text. No bullet points. No headers.
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
        raise RuntimeError("AI_API_KEY is not set.")

    return genai.Client(api_key=settings.AI_API_KEY)


def _fallback_explanation(
    test_name: str,
    value: Optional[str],
    unit: Optional[str],
    reference_range: Optional[str],
    range_status: str,
) -> str:
    """
    Generate a basic template explanation without AI.
    Used when AI is unavailable.
    """
    val_str = f"{value} {unit}".strip() if value else "not recorded"
    ref_str = f"(Reference range: {reference_range})" if reference_range else "(Reference range not provided)"

    return (
        f"{test_name} is a measurement from your medical report. "
        f"Your reported value is {val_str} {ref_str}. "
        f"{range_status}"
    )


def _generate_with_fallback(client, prompt: str) -> str:
    """Generate explanation using primary model, trying fallbacks if demand spikes occur."""
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
            logger.warning("Explanation model %s failed: %s. Trying next available model.", model_name, exc)

    raise RuntimeError(f"AI explanation call failed across all models: {last_error}")


def generate_explanation(
    test_name: str,
    value: Optional[str],
    unit: Optional[str],
    reference_range: Optional[str],
) -> str:
    """
    Generate a patient-friendly explanation for a test result.

    Tries AI first; falls back to a template explanation if AI is unavailable.

    Args:
        test_name: Name of the medical test.
        value: Reported value string.
        unit: Unit string (may be None).
        reference_range: Reference range string from the report (may be None).

    Returns:
        Explanation string (never empty, never a diagnosis).
    """
    range_status = compute_range_status(value, reference_range)

    val_display = value or "not recorded"
    unit_display = unit or ""
    range_display = reference_range or "not provided in this report"

    if not settings.AI_API_KEY:
        logger.info(
            "AI_API_KEY not set — using fallback explanation for: %s", test_name
        )
        return _fallback_explanation(
            test_name, value, unit, reference_range, range_status
        )

    try:
        client = _get_gemini_client()
        prompt = EXPLANATION_PROMPT.format(
            test_name=test_name,
            value=val_display,
            unit=unit_display,
            reference_range=range_display,
            range_status=range_status,
        )
        raw_text = _generate_with_fallback(client, prompt)
        explanation = raw_text.strip()

        if not explanation:
            raise ValueError("Empty AI explanation response")

        # Safety validation layer: do not allow diagnostic claims or treatment advice
        if not is_safe_explanation(explanation):
            logger.warning(
                "AI explanation for '%s' failed safety validation. Falling back to template.",
                test_name,
            )
            return _fallback_explanation(
                test_name, value, unit, reference_range, range_status
            )

        logger.info("AI explanation generated and validated for: %s", test_name)
        return explanation

    except Exception as exc:
        logger.warning(
            "AI explanation failed for %s: %s. Using fallback.", test_name, exc
        )
        return _fallback_explanation(
            test_name, value, unit, reference_range, range_status
        )
