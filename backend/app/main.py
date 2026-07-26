"""
main.py — the FastAPI application entry point.

Why this file exists: it is the single object uvicorn runs. Routes live here until
a file gets crowded enough to justify splitting. Phase 1 adds saving and listing
complaints; the AI endpoints arrive in later phases.
"""
import json

from fastapi import FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .agent import run_agent
from .database import Base, engine, get_db
from .document import extract_text

# Create the `complaints` table if it doesn't exist yet. Simple and enough for
# this assignment — no migration tool (Alembic) needed for a single-table schema.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA Complaint Management API")

# The React dev server (Vite) runs on http://localhost:5173 and calls this API
# from the browser. Without CORS the browser would block those requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Readiness check — lets us confirm the API is up."""
    return {"status": "ok"}


@app.post("/complaints", response_model=schemas.ComplaintOut)
def create_complaint(payload: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    """Persist a complaint (the 'Save Complaint' button in the demo)."""
    complaint = models.Complaint(**payload.model_dump())
    db.add(complaint)
    db.commit()
    db.refresh(complaint)   # reload so id/status/created_at come back populated
    return complaint


@app.get("/complaints", response_model=list[schemas.ComplaintOut])
def list_complaints(db: Session = Depends(get_db)):
    """Return all saved complaints, newest first."""
    return db.query(models.Complaint).order_by(models.Complaint.created_at.desc()).all()


@app.post("/chat", response_model=schemas.ChatResponse)
def chat(req: schemas.ChatRequest):
    """
    One AI Copilot turn. Runs the LangGraph agent on the user's message and the
    current form, returning the changed fields (patch), the full merged form, and
    a short reply. Stateless — the frontend owns the form and sends it each turn.
    """
    return run_agent(req.message, req.current_form)


@app.post("/chat/upload", response_model=schemas.ChatResponse)
async def chat_upload(file: UploadFile = File(...), current_form: str = Form("{}")):
    """
    Document intake. This endpoint ONLY converts the uploaded file to plain text,
    then hands that text to the exact same run_agent() pipeline that /chat uses.
    No separate AI workflow. `current_form` arrives as a JSON string in the multipart
    form so an upload can also act as an edit on an existing complaint.
    """
    content = await file.read()
    try:
        text = extract_text(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not text.strip():
        # e.g. a scanned/image-only PDF — we don't do OCR, so there's no text to read.
        return {"patch": {}, "form": json.loads(current_form), "risk": {},
                "reply": "I couldn't read any text from that document. "
                         "If it's a scanned image, please paste the text instead."}

    return run_agent(text, json.loads(current_form))
