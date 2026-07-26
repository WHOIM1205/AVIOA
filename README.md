git add README.md# AIVOA — AI-Powered Customer Complaint Management System


A two-panel complaint-intake tool for pharmaceutical QMS (API & FDF manufacturing).
The **left panel** is a display-only complaint form; the **right panel** is an **AI
Copilot** that extracts structured complaint data from pasted text or an uploaded
document, auto-populates the form, produces a risk assessment, and lets the user refine
any field by chatting. The user never types into the form directly.

<<<<<<< HEAD

## Features

- AI complaint extraction from free text
- AI powered complaint editing through chat
- PDF TXT and EML document upload
- AI risk assessment
- PostgreSQL complaint persistence
- FastAPI backend with LangGraph
- Redux based frontend state management


See [`DECISIONS.md`](./DECISIONS.md) for the architecture and the reasoning behind it.

## Tech stack

React + Redux Toolkit · FastAPI · LangGraph · Groq LLM • PostgreSQL
=======
See [`DECISIONS.md`](./DECISIONS.md) for the full reasoning behind every design choice.

## Tech stack

React + Redux Toolkit · FastAPI · LangGraph · Groq (`llama-3.3-70b-versatile`) · PostgreSQL

> **Model note:** the assignment specifies Groq `gemma2-9b-it`, but Groq has
> **decommissioned** it. We use the assignment's named fallback
> `llama-3.3-70b-versatile`. It's a one-line change in `backend/.env`
> (`GROQ_MODEL=…`) because the model name is read from config, never hard-coded.

## Features

### Core workflow
- **AI extraction** — paste a complaint (or upload a document); the AI fills the form.
- **Conversational editing** — "batch is BMX24602, quantity 48 capsules" updates only
  those fields; everything else is preserved.
- **Risk assessment** — an independent severity / priority / rationale for the complaint.
- **Document upload** — PDF / TXT / EML (no OCR; production parsing not required).
- **Save & list** — persist complaints to PostgreSQL.

### Bonus AI features (all optional in the assignment — all implemented)
1. **Completeness Checker** — deterministic ✔/✖ per field + a completion score (no LLM).
2. **Complaint Summary** — a short professional summary of the complaint.
3. **Root Cause Recommendation** — probable root causes.
4. **CAPA Recommendation** — recommended corrective/preventive actions.
5. **Duplicate Detection** — deterministic PostgreSQL comparison (no embeddings/vectors)
   that warns (but never blocks) on save.
6. **Risk Confidence** — a deterministic 0-100 confidence in the risk classification.
>>>>>>> 8ba6a39 (feat: add frontend bonus features and documentation)

## Project layout

```
docker-compose.yml            PostgreSQL 16 container (host port 5433)
DECISIONS.md                  architecture + reasoning (interview crib sheet)
samples/                      realistic complaint fixtures (.pdf/.txt/.eml) for the demo

backend/                      FastAPI + LangGraph + Groq
  app/
    main.py                   API routes
    config.py                 reads env vars
    database.py               SQLAlchemy engine / session / Base
    models.py                 Complaint table
    schemas.py                Pydantic request/response models
    agent.py                  LangGraph agent (extract→merge→completeness→assess_risk→advise)
    document.py               PDF/TXT/EML → plain text
    completeness.py           Bonus 1: deterministic completeness (pure Python)
    duplicate.py              Bonus 5: deterministic duplicate detection (pure Python)
  requirements.txt
  .env.example

frontend/                     React + Redux Toolkit (Vite)
  src/
    main.jsx                  React entry + Redux <Provider>
    App.jsx                   two-panel layout
    store.js                  Redux store (complaint + chat slices)
    config.js                 backend URL from VITE_API_BASE_URL
    api.js                    fetch helpers
    features/
      complaintSlice.js       form, completeness, risk, advisory, duplicates
      chatSlice.js            messages, loading
    components/
      ComplaintForm.jsx       LEFT: read-only form + save (with duplicate check)
      Copilot.jsx             RIGHT: upload, chat, risk, cards, send
      CompletenessCard.jsx    Bonus 1
      SummaryCard.jsx         Bonus 2
      AdvisoryCard.jsx        Bonus 3 + 4 (root causes + CAPA)
      DuplicateCard.jsx       Bonus 5
  .env.example
```

## The LangGraph agent

One graph, reused by both pasted text and document upload:

```
message → extract → merge → completeness → assess_risk → advise → { patch, form,
          (LLM)    (py)     (py, no LLM)   (LLM +conf)   (LLM)       completeness,
                                                                     risk, summary,
                                                                     root_causes, capa,
                                                                     reply }
```

- **extract** — LLM → a JSON *patch* of only the fields the text mentions (stateless).
- **merge** — pure Python `{**current_form, **patch}`; preserves untouched fields.
- **completeness** — pure Python; ✔/✖ per field + score.
- **assess_risk** — LLM → separate `{severity, priority, rationale}`; a deterministic
  `confidence` is appended in Python. Never writes form fields.
- **advise** — ONE LLM call → `{summary, root_causes, capa}`. Runs **only when `patch`
  is non-empty**; when skipped it emits nothing, so the frontend keeps the previous cards.

## Setup & run

### 1. Database (Docker)
```bash
docker compose up -d          # PostgreSQL 16 on host port 5433
```

### 2. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then set GROQ_API_KEY in .env
uvicorn app.main:app --reload # http://localhost:8000  (health: /health)
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173.

## How to use (demo flow)
1. Paste a complaint, or upload a file from `samples/`.
2. The left form fills in; the risk, completeness, summary, root-cause and CAPA cards appear.
3. Refine by chatting: e.g. "batch is BMX24602, quantity 48 capsules" (only those change).
4. Click **Save Complaint**; if a similar complaint already exists you'll be warned and can
   still confirm with **Save anyway**.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | readiness check |
| POST | `/chat` | one copilot turn from text |
| POST | `/chat/upload` | one copilot turn from a document (PDF/TXT/EML) |
| POST | `/complaints` | save a complaint |
| GET | `/complaints` | list complaints |
| POST | `/complaints/check-duplicate` | deterministic duplicate check (read-only) |

**`/chat` and `/chat/upload` response shape:**
```json
{
  "patch": { "batch_lot_number": "BMX24602" },
  "form":  { "...": "the full merged form" },
  "completeness": { "fields": { "customer_name": true, "...": false }, "score": 62 },
  "risk":  { "severity": "High", "priority": "Urgent", "rationale": "…", "confidence": 85 },
  "summary": "…",                       // null when advise was skipped (keep previous)
  "root_causes": ["…", "…"],            // null when advise was skipped
  "capa": ["…", "…"],                   // null when advise was skipped
  "reply": "Updated: batch_lot_number."
}
```
All bonus fields are additive; the core `patch`/`form`/`risk`/`reply` contract is unchanged.

**`/complaints/check-duplicate` response:**
```json
{ "duplicates": [ { "id": 7, "similarity": 97, "matched_fields": ["batch_lot_number", "product_name"] } ] }
```

## Configuration
- `backend/.env`: `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`
- `frontend/.env`: `VITE_API_BASE_URL` (defaults to `http://localhost:8000`)

## Design principles
- **Deterministic where possible.** Completeness, duplicate detection, and risk
  confidence are pure Python — no LLM cost, fully explainable.
- **Additive bonus features.** Every bonus plugs into the existing graph / API / UI
  without changing the core `extract → merge → assess_risk` flow or any contract.
- **Stateless backend.** Redux is the single source of truth; the form is sent each turn.
- **No over-engineering.** No auth, no repository layers, no migration tool, no OCR,
  no vector database — only what the workflow needs.
