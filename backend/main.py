"""
AI-Powered Medical Report Simplifier — FastAPI Application

Entry point. Configures:
  - CORS middleware
  - Lifespan (DB init on startup)
  - Health endpoint
  - Report routes
  - Swagger / OpenAPI documentation
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes.reports import router as reports_router
from schemas import HealthResponse

# ── Logging setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan: runs on startup and shutdown ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Medical Report Simplifier API...")
    init_db()
    logger.info("Database initialised.")
    yield
    logger.info("Shutting down Medical Report Simplifier API.")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Medical Report Simplifier API",
    description=(
        "AI-powered backend that accepts uploaded medical reports (PDF/image), "
        "extracts text (including OCR for scanned documents), uses AI to identify "
        "test names, values, units, and reference ranges, and returns structured, "
        "patient-friendly summaries.\n\n"
        "**Disclaimer**: This API does not provide medical diagnosis or treatment advice."
    ),
    version="1.0.0",
    contact={
        "name": "Versathon 2.0 Team",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Configured via CORS_ORIGINS in environment variables (defaults to * for development)
from config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(reports_router)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Health check",
    description="Returns API status and database connectivity state.",
)
def health_check():
    """Verify that the API is running and the database is accessible."""
    from database import SessionLocal
    from sqlalchemy import text

    db_status = "unavailable"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as exc:
        logger.error("Health check DB error: %s", exc)
        db_status = "error"

    return HealthResponse(status="ok", database=db_status)


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"], summary="API root")
def root():
    return {
        "message": "Medical Report Simplifier API is running",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0",
    }