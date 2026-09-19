"""
Application configuration.
All settings are read from environment variables / .env file.
Never hardcode secrets here.
"""

import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite:///./medical_reports.db"

    # AI provider
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-1.5-flash"

    # File storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 20

    # Allowed file extensions and MIME types
    ALLOWED_EXTENSIONS: set = {"pdf", "jpg", "jpeg", "png"}
    ALLOWED_MIME_TYPES: set = {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    }


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
