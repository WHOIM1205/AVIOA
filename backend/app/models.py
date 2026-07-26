"""
models.py — the database tables as Python classes.

Why this file exists: one place that defines what a stored complaint looks like.
The columns mirror the four sections of the "Log Customer Complaint" form in the
demo UI, so the thing we save matches the thing the user sees.

Why every field is a String: the values come from fuzzy AI extraction (a date
might arrive as "12 Mar 2024" and a quantity as "48 capsules"). Storing them as
text keeps things simple and avoids brittle validation the assignment doesn't need.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from .database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)

    # 1. Origin & Customer Details
    complaint_source = Column(String)
    customer_name = Column(String)

    # 2. Product & Batch Identification
    product_name = Column(String)
    product_strength_grade = Column(String)
    batch_lot_number = Column(String)
    manufacturing_date = Column(String)
    expiry_date = Column(String)
    quantity_affected = Column(String)

    # 3. Complaint Details
    complaint_type = Column(String)
    complaint_date = Column(String)
    detailed_description = Column(Text)

    # 4. Initial Assessment & Priority
    initial_severity = Column(String)
    priority = Column(String)

    # Workflow metadata
    status = Column(String, default="Pending Triage")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
