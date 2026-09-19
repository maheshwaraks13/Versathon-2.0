"""
File validation and secure storage service.

Responsibilities:
  - Validate MIME type, extension, file size, and content
  - Generate a UUID-based internal filename (never expose original filename as path)
  - Save the file to UPLOAD_DIR
  - Prevent path traversal and dangerous filenames
"""

import logging
import os
import uuid

from fastapi import HTTPException, UploadFile

from config import settings

logger = logging.getLogger(__name__)

# Maximum file size in bytes
MAX_FILE_SIZE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _get_extension(filename: str) -> str:
    """Return lowercase file extension without the leading dot."""
    return os.path.splitext(filename)[-1].lstrip(".").lower()


def validate_file(file: UploadFile) -> None:
    """
    Validate the uploaded file for type, extension, and basic integrity.
    Raises HTTPException on any validation failure.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = _get_extension(file.filename)
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Allowed types: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}."
            ),
        )

    if file.content_type and file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported MIME type '{file.content_type}'.",
        )


async def save_upload(file: UploadFile) -> tuple[str, str, str]:
    """
    Read and save the uploaded file to UPLOAD_DIR.

    Returns:
        (original_filename, internal_storage_path, file_extension)

    Raises:
        HTTPException: on empty file or oversized file.
    """
    original_filename = file.filename or "unknown"
    ext = _get_extension(original_filename)

    logger.info("Upload started: original_filename=%s", original_filename)

    # Read file content
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size {len(content) / (1024*1024):.1f} MB exceeds "
                f"the maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB."
            ),
        )

    # Generate a UUID-based internal filename — never use original filename as path
    internal_name = f"{uuid.uuid4().hex}.{ext}"
    storage_path = os.path.join(settings.UPLOAD_DIR, internal_name)

    # Ensure path stays within UPLOAD_DIR (prevent path traversal)
    abs_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    abs_storage_path = os.path.abspath(storage_path)
    if not abs_storage_path.startswith(abs_upload_dir):
        raise HTTPException(status_code=400, detail="Invalid file path.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    with open(abs_storage_path, "wb") as f:
        f.write(content)

    logger.info(
        "Upload completed: original=%s stored=%s size=%d bytes",
        original_filename,
        internal_name,
        len(content),
    )

    return original_filename, abs_storage_path, ext
