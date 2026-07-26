"""
duplicate.py — deterministic duplicate-complaint detection (Bonus Feature 5).

No embeddings, no vector database, no LLM. We compare the current complaint against
previously saved complaints on four identifying fields, using difflib for light fuzzy
matching (so "Apollo Pharmacy" ~ "Apollo Pharmacy Ltd" still counts), and return any
past complaint whose weighted similarity crosses a threshold.
"""
from difflib import SequenceMatcher

# Fields we compare, with weights that sum to 100. Batch/lot is the strongest identity
# signal, so it carries the most weight.
COMPARE_WEIGHTS = {
    "batch_lot_number": 40,
    "product_name": 25,
    "customer_name": 20,
    "complaint_type": 15,
}

SIMILARITY_THRESHOLD = 60  # percent; at/above this we flag a potential duplicate
FIELD_MATCH_THRESHOLD = 0.85  # a single field counts as "matched" at/above this ratio


def _norm(value) -> str:
    """Lowercase, trim, and collapse whitespace so trivial differences don't matter."""
    return " ".join(str(value or "").lower().split())


def _field_match(a, b) -> float:
    """Similarity of one field, 0..1. Exact (normalized) = 1.0; otherwise fuzzy ratio."""
    a, b = _norm(a), _norm(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


def find_duplicates(form: dict, existing: list) -> list:
    """
    Compare `form` against each existing complaint (a dict with the same field names).
    Returns matches sorted by similarity desc:
        [{ "id": int, "similarity": int, "matched_fields": [str, ...] }, ...]
    """
    matches = []
    for row in existing:
        score = 0.0
        matched = []
        for field, weight in COMPARE_WEIGHTS.items():
            ratio = _field_match(form.get(field), row.get(field))
            score += weight * ratio
            if ratio >= FIELD_MATCH_THRESHOLD:
                matched.append(field)
        similarity = round(score)
        if similarity >= SIMILARITY_THRESHOLD:
            matches.append({
                "id": row.get("id"),
                "similarity": similarity,
                "matched_fields": matched,
            })
    matches.sort(key=lambda m: m["similarity"], reverse=True)
    return matches
