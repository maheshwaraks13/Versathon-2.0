"""
Database connection and session management.

The engine is driven entirely by the DATABASE_URL environment variable.
Default: SQLite (zero config for development/hackathon).
Production: set DATABASE_URL to a PostgreSQL or Supabase connection string.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings

# SQLite requires connect_args for thread safety in FastAPI
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set to True to log SQL queries during debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist."""
    # Import models to register them with Base.metadata
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
