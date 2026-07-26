"""
completeness.py — pure-Python complaint completeness check (Bonus Feature 1).

Why this file exists: after every extraction or edit we want to tell the user how
complete the complaint is — which fields are filled and an overall score. This needs
NO LLM: it is a simple presence check over the known fields, so we keep it fully
deterministic and instant.

The field list is taken straight from the API schema (ComplaintBase) so there is a
single source of truth and no duplicated list to keep in sync.
"""
from .schemas import ComplaintBase

# All 13 complaint fields count toward completeness (per the finalized plan).
REQUIRED_FIELDS = list(ComplaintBase.model_fields.keys())


def compute_completeness(form: dict) -> dict:
    """
    Given the current form, return which fields are present and an overall score.

    Returns: { "fields": { field_name: bool, ... }, "score": int (0-100) }
    A field counts as present when it has a non-empty value.
    """
    fields = {name: bool(form.get(name)) for name in REQUIRED_FIELDS}
    filled = sum(1 for present in fields.values() if present)
    score = round(filled / len(REQUIRED_FIELDS) * 100) if REQUIRED_FIELDS else 0
    return {"fields": fields, "score": score}
