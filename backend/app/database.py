"""
database.py — the SQLAlchemy plumbing (engine, session, Base).

Why this file exists: it holds the three things every DB-touching module needs,
in one place — the engine (the actual connection to Postgres), a session factory
(one short-lived session per request), and Base (the parent class our table
models inherit from).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL

# The engine manages the connection pool to Postgres.
engine = create_engine(DATABASE_URL)

# SessionLocal() gives us a new database session. We open one per request.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Every table model (e.g. Complaint) inherits from Base.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency: hand a fresh session to a route, then always close it.
    Using `yield` guarantees the session is closed even if the route errors.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
