"""
schemas.py — Pydantic models that define API request/response shapes.

Why this file exists (and is separate from models.py): SQLAlchemy models describe
the *database*; Pydantic schemas describe the *API*. Keeping them apart is the
standard FastAPI pattern and lets each change independently.

Every field is Optional because the AI often fills only some of the form — a saved
complaint may legitimately have blanks.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ComplaintBase(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength_grade: Optional[str] = None
    batch_lot_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity_affected: Optional[str] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[str] = None
    detailed_description: Optional[str] = None
    initial_severity: Optional[str] = None
    priority: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    """What the client sends to POST /complaints."""
    pass


class ComplaintOut(ComplaintBase):
    """What the API returns — adds the server-generated fields."""
    id: int
    status: str
    created_at: datetime

    # Lets Pydantic read the fields straight off a SQLAlchemy object.
    model_config = {"from_attributes": True}


# ---- AI Copilot chat (Phase 2) ----

class ChatRequest(BaseModel):
    """One copilot turn from the frontend."""
    message: str
    current_form: dict = {}   # the form as it stands, so the backend can merge onto it


class ChatResponse(BaseModel):
    """What the copilot returns for one turn."""
    patch: dict          # only the fields that changed this turn
    form: dict           # the full form after merging (frontend replaces its form with this)
    risk: dict = {}      # independent risk assessment (severity/priority/rationale); never the form
    reply: str           # short assistant message for the chat log
