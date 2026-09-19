"""
Document processing service.

For PDF files:
  1. Attempt native text extraction using pdfplumber.
  2. Check if extracted text is usable (minimum character threshold).
  3. If the PDF appears to be scanned/image-based, fall back to OCR.

For image files (JPG, PNG):
  - Always use OCR.

The original uploaded file is never modified.
"""

import logging

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

from services import ocr_service

logger = logging.getLogger(__name__)

# Minimum number of non-whitespace characters to consider PDF text "usable"
MIN_USABLE_TEXT_CHARS = 50


def _is_usable_text(text: str) -> bool:
    """Return True if the extracted text has enough content to work with."""
    if not text:
        return False
    # Strip whitespace and check character count
    stripped = text.strip()
    non_space = len([c for c in stripped if not c.isspace()])
    return non_space >= MIN_USABLE_TEXT_CHARS


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.

    Strategy:
      1. Try pdfplumber for native text extraction.
      2. If text is insufficient, fall back to OCR (pdf2image + tesseract).

    Args:
        file_path: Absolute path to the PDF file.

    Returns:
        Extracted text string.

    Raises:
        RuntimeError: If all extraction methods fail.
    """
    logger.info("Text extraction started for PDF: %s", file_path)

    # Step 1: Native PDF text extraction
    if PDFPLUMBER_AVAILABLE:
        try:
            with pdfplumber.open(file_path) as pdf:
                pages_text = []
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    pages_text.append(page_text)

            combined_text = "\n\n".join(pages_text).strip()
            logger.info(
                "pdfplumber extracted %d chars from %s", len(combined_text), file_path
            )

            if _is_usable_text(combined_text):
                logger.info("Native PDF text is usable. Skipping OCR.")
                return combined_text
            else:
                logger.info(
                    "Native PDF text insufficient (%d chars). Falling back to OCR.",
                    len(combined_text),
                )
        except Exception as exc:
            logger.warning(
                "pdfplumber failed for %s: %s. Falling back to OCR.", file_path, exc
            )
    else:
        logger.warning("pdfplumber not installed — falling back directly to OCR.")

    # Step 2: OCR fallback for scanned/image-based PDFs
    logger.info("OCR fallback initiated for PDF: %s", file_path)
    return ocr_service.ocr_pdf_file(file_path)


def extract_text_from_image(file_path: str) -> str:
    """
    Extract text from a JPG or PNG image file via OCR.

    Args:
        file_path: Absolute path to the image file.

    Returns:
        Extracted text string.

    Raises:
        RuntimeError: If OCR fails.
    """
    logger.info("OCR extraction started for image: %s", file_path)
    return ocr_service.ocr_image_file(file_path)


def extract_text(file_path: str, file_type: str) -> str:
    """
    Dispatch text extraction based on file type.

    Args:
        file_path: Absolute path to the stored file.
        file_type: File extension (pdf, jpg, jpeg, png).

    Returns:
        Extracted text string.

    Raises:
        ValueError: If the file type is unsupported.
        RuntimeError: If extraction fails.
    """
    file_type_lower = file_type.lower().lstrip(".")

    if file_type_lower == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_type_lower in {"jpg", "jpeg", "png"}:
        return extract_text_from_image(file_path)
    else:
        raise ValueError(f"Unsupported file type for text extraction: {file_type}")
