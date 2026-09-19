"""
OCR service.

Extracts text from images and scanned PDF pages using Tesseract.
This layer is modular — swap the underlying OCR provider by modifying
_ocr_image() without changing the public interface.

Requirements:
  - Tesseract OCR binary must be installed on the system.
    Windows: https://github.com/UB-Mannheim/tesseract/wiki
    Install and add to PATH, or set pytesseract.tesseract_cmd explicitly.
  - pip install pytesseract Pillow pdf2image
  - On Windows, pdf2image also requires poppler:
    https://github.com/oschwartz10612/poppler-windows/releases
"""

import logging
from io import BytesIO

from PIL import Image

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

logger = logging.getLogger(__name__)


def _ocr_image(image: Image.Image) -> str:
    """
    Run Tesseract OCR on a single PIL image.
    Returns the extracted text string.
    """
    if not TESSERACT_AVAILABLE:
        raise RuntimeError(
            "pytesseract is not installed. Run: pip install pytesseract"
        )

    # Use page segmentation mode 1 (automatic with OSD) for medical reports
    custom_config = r"--oem 3 --psm 1"
    text = pytesseract.image_to_string(image, config=custom_config)
    return text.strip()


def ocr_image_file(file_path: str) -> str:
    """
    OCR a JPG or PNG image file.

    Args:
        file_path: Absolute path to the image file.

    Returns:
        Extracted text string.

    Raises:
        RuntimeError: If OCR is unavailable or fails.
    """
    logger.info("OCR started for image: %s", file_path)

    try:
        image = Image.open(file_path).convert("RGB")
        text = _ocr_image(image)
        logger.info("OCR completed for image: %s (chars=%d)", file_path, len(text))
        return text
    except Exception as exc:
        logger.error("OCR failed for image %s: %s", file_path, exc)
        raise RuntimeError(f"OCR failed: {exc}") from exc


def ocr_pdf_file(file_path: str) -> str:
    """
    OCR a scanned PDF by converting each page to an image first.

    Args:
        file_path: Absolute path to the PDF file.

    Returns:
        Extracted text string (all pages joined).

    Raises:
        RuntimeError: If OCR or PDF conversion is unavailable or fails.
    """
    logger.info("OCR started for scanned PDF: %s", file_path)

    if not PDF2IMAGE_AVAILABLE:
        raise RuntimeError(
            "pdf2image is not installed. Run: pip install pdf2image\n"
            "Also ensure poppler is installed and in PATH."
        )

    try:
        with open(file_path, "rb") as f:
            pdf_bytes = f.read()

        pages = convert_from_bytes(pdf_bytes, dpi=300)
        logger.info("PDF has %d page(s) to OCR", len(pages))

        all_text = []
        for i, page in enumerate(pages):
            page_text = _ocr_image(page)
            logger.debug("Page %d OCR chars: %d", i + 1, len(page_text))
            all_text.append(page_text)

        combined = "\n\n".join(all_text).strip()
        logger.info(
            "OCR completed for PDF: %s (total chars=%d)", file_path, len(combined)
        )
        return combined

    except RuntimeError:
        raise
    except Exception as exc:
        logger.error("OCR failed for PDF %s: %s", file_path, exc)
        raise RuntimeError(f"OCR failed for PDF: {exc}") from exc
