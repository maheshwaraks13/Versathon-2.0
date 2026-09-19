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
    AI_MODEL: str = "gemini-3.5-flash"

    # File storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 20

    # CORS settings (comma-separated list of origins or * for all)
    CORS_ORIGINS: str = "*"

    # Allowed file extensions and MIME types
    ALLOWED_EXTENSIONS: set = {"pdf", "jpg", "jpeg", "png"}
    ALLOWED_MIME_TYPES: set = {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    }

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins parsed as a list."""
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
