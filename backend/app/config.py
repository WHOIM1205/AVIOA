"""
config.py — one place to read environment variables.

Why this file exists: every other module needs the DB URL and Groq key.
Reading them here once (instead of calling os.getenv all over the codebase)
keeps configuration in a single, easy-to-explain spot.
"""
import os
from dotenv import load_dotenv

# Load backend/.env into os.environ. Called once, at import time.
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5433/aivoa",
)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
# gemma2-9b-it (the assignment's first choice) was decommissioned by Groq;
# llama-3.3-70b-versatile is the assignment's named fallback. Overridable via .env.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
