"""
agent.py — the LangGraph complaint-extraction agent.

Why this file exists: it holds the entire AI workflow in one place, as an explicit
graph, so it is easy to walk through on the demo video.

The graph has exactly two nodes:

    (message) --> extract --> merge --> (patch, form, reply)

- extract : the ONE LLM call. Reads the user's text and returns a JSON *patch* —
            only the fields the text actually mentions. It is stateless on purpose;
            it does not see the existing form, so its only job is "text -> fields".
- merge   : pure Python. Applies the patch on top of the current form. Because it
            only overwrites the keys in the patch, every other field is preserved.
            This node is what makes "update only the batch number" safe.

Keeping the extractor stateless means a full complaint paste and a one-line edit
("batch is BMX24602") go through the exact same path.
"""
import json
from typing import TypedDict

from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END

from .config import GROQ_API_KEY, GROQ_MODEL

# The 13 form fields the AI is allowed to fill. Anything outside this list is dropped.
COMPLAINT_FIELDS = [
    "complaint_source", "customer_name", "product_name", "product_strength_grade",
    "batch_lot_number", "manufacturing_date", "expiry_date", "quantity_affected",
    "complaint_type", "complaint_date", "detailed_description",
    "initial_severity", "priority",
]

# Concise, deterministic instructions. We describe each field once and forbid guessing.
EXTRACT_SYSTEM_PROMPT = """You extract pharmaceutical customer-complaint details from text into JSON.

Return ONLY a JSON object whose keys are a subset of:
- complaint_source: where it came from (email, phone, distributor, portal)
- customer_name: person or company complaining
- product_name: the product
- product_strength_grade: strength/grade (e.g. 500mg, USP grade)
- batch_lot_number: batch or lot number
- manufacturing_date: manufacturing date, as written
- expiry_date: expiry date, as written
- quantity_affected: affected quantity, as written (e.g. "48 capsules")
- complaint_type: nature of the issue (e.g. discoloration, contamination, packaging defect)
- complaint_date: date the complaint was raised, as written
- detailed_description: a concise description of the problem
- initial_severity: one of Low, Medium, High, Critical (only if implied/stated)
- priority: one of Low, Medium, High, Urgent (only if implied/stated)

Rules (critical — the form keeps existing values for any key you omit):
- Only include a field if its value is EXPLICITLY stated in the user input.
- Never infer, assume, or guess a value that is not present in the text.
- If a value is not mentioned, OMIT that key entirely — do not output null, "", or a placeholder.
- Return only fields the input explicitly supports. If nothing is stated, return {}.
- Every value must be a plain string. Output only the JSON object, nothing else."""


# Prompt for the risk node. It only *reads* the complaint and outputs a separate
# opinion. It is deliberately not allowed to touch or restate form fields.
RISK_SYSTEM_PROMPT = """You are a pharmaceutical QMS (Quality Management System) risk classifier.
You are given a customer complaint as JSON. Assess the quality/safety risk it represents.

Return ONLY a JSON object with exactly these three keys:
- severity: one of "Low", "Medium", "High", "Critical"
- priority: one of "Low", "Medium", "High", "Urgent"
- rationale: one or two sentences justifying the rating, grounded in the complaint.

Base the assessment only on the complaint provided. Do not repeat the complaint fields.
Output only the JSON object, nothing else."""


# The LLM is built lazily so importing this module never requires the API key.
_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        _llm = ChatGroq(
            model=GROQ_MODEL,
            api_key=GROQ_API_KEY,
            temperature=0,
            # Strict JSON mode: Groq guarantees the reply is a single JSON object,
            # so no markdown fences and no prose can slip in. (JSON mode requires
            # the word "JSON" in the prompt, which our system prompt satisfies.)
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm


def _parse_json(text: str):
    """Parse the model reply into a dict. Return None if it isn't valid JSON."""
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, TypeError):
        return None


def _validate_patch(raw: dict) -> dict:
    """
    Keep ONLY fields defined in the complaint schema, with non-empty string values.
    This silently drops any extra keys or non-string values the model might emit.
    """
    return {
        k: v.strip()
        for k, v in raw.items()
        if k in COMPLAINT_FIELDS and isinstance(v, str) and v.strip()
    }


# The only keys a risk object may contain. Anything else is dropped.
RISK_FIELDS = ["severity", "priority", "rationale"]


def _validate_risk(raw: dict) -> dict:
    """Keep only the three risk keys, as non-empty strings. Drops everything else."""
    return {
        k: v.strip()
        for k, v in raw.items()
        if k in RISK_FIELDS and isinstance(v, str) and v.strip()
    }


class ChatState(TypedDict, total=False):
    message: str        # what the user typed (or the text pulled from a document)
    current_form: dict  # the form as it stands before this turn
    patch: dict         # fields the extractor found in `message`
    form: dict          # current_form + patch (the new full form)
    risk: dict          # independent risk assessment of `form` (never merged into it)
    reply: str          # short message shown back in the chat
    error: str          # set if the LLM call or JSON parsing failed


def extract_node(state: ChatState) -> dict:
    """LLM step: message -> validated JSON patch of only the mentioned schema fields."""
    try:
        resp = _get_llm().invoke(
            [("system", EXTRACT_SYSTEM_PROMPT), ("human", state["message"])]
        )
    except Exception:
        # Network / auth / rate-limit problems: fail softly, never crash the request.
        return {"patch": {}, "error": "llm"}

    raw = _parse_json(resp.content)
    if raw is None:
        # Model returned something that isn't a JSON object.
        return {"patch": {}, "error": "parse"}

    # Validate before merging: strip to schema fields only.
    return {"patch": _validate_patch(raw), "error": ""}


def merge_node(state: ChatState) -> dict:
    """Pure Python step: apply the patch onto the current form, preserving the rest."""
    current = state.get("current_form", {})
    error = state.get("error", "")

    # On failure, leave the form exactly as it was and explain politely.
    if error == "llm":
        return {"form": current,
                "reply": "Sorry — I couldn't reach the AI service just now. Please try again in a moment."}
    if error == "parse":
        return {"form": current,
                "reply": "Sorry — I couldn't read that clearly. Could you rephrase the complaint details?"}

    patch = state["patch"]
    merged = {**current, **patch}
    if patch:
        reply = "Updated: " + ", ".join(patch.keys()) + "."
    else:
        reply = "I couldn't find any complaint details to update in that message."
    return {"form": merged, "reply": reply}


def assess_risk_node(state: ChatState) -> dict:
    """
    Reads the merged form and returns a SEPARATE risk object. It returns only the
    `risk` key — never any form field — so it can never overwrite the complaint.
    Skips the LLM call when there is nothing to assess (error, or empty form).
    """
    if state.get("error"):
        return {"risk": {}}
    form = state.get("form", {})
    if not form:
        return {"risk": {}}
    try:
        resp = _get_llm().invoke(
            [("system", RISK_SYSTEM_PROMPT), ("human", json.dumps(form))]
        )
    except Exception:
        # A risk failure must not discard the extraction the user just got.
        return {"risk": {}}
    raw = _parse_json(resp.content)
    if raw is None:
        return {"risk": {}}
    return {"risk": _validate_risk(raw)}


def _build_agent():
    graph = StateGraph(ChatState)
    graph.add_node("extract", extract_node)
    graph.add_node("merge", merge_node)
    graph.add_node("assess_risk", assess_risk_node)
    graph.add_edge(START, "extract")
    graph.add_edge("extract", "merge")
    graph.add_edge("merge", "assess_risk")
    graph.add_edge("assess_risk", END)
    return graph.compile()


# Compiled once at import; reused for every request.
agent = _build_agent()


def run_agent(message: str, current_form: dict | None = None) -> dict:
    """Entry point used by the /chat endpoint."""
    result = agent.invoke({"message": message, "current_form": current_form or {}})
    return {
        "patch": result["patch"],
        "form": result["form"],
        "risk": result.get("risk", {}),
        "reply": result["reply"],
    }
