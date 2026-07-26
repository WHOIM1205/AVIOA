# Design Decisions

A running log of *why* we built things this way — the crib sheet for the interview.

## Stack (all mandated by the assignment)

| Layer | Choice | Why this specific option |
|-------|--------|--------------------------|
| Frontend | React + Redux Toolkit + Vite | Redux is required. RTK is the modern, boilerplate-free way to use Redux. Vite = fastest, simplest dev server. |
| Backend | FastAPI + Uvicorn | Required. FastAPI gives typed request/response models with almost no code. |
| AI agent | LangGraph | Required. Lets us express the agent as an explicit, drawable graph of steps — easy to walk through on video. |
| LLM | Groq `gemma2-9b-it` | Required. Groq is very low-latency, which keeps the "type → form fills in" demo snappy. |
| Database | PostgreSQL + SQLAlchemy + psycopg2 | Postgres is the most common FastAPI pairing and the easiest to explain. |
| Font | Google Inter | Required. |

## Core architecture (kept deliberately simple)

**The AI Copilot is a stateful conversation; the complaint form is its shared state.**

- The left form is **display-only** — the user never types into it (per the demo). All changes flow through the chat.
- **Redux is the single source of truth.** It holds the current form + chat history.
- Each copilot turn: frontend sends `{ message, current_form, history }` → backend is
  **stateless** and returns `{ patch, risk, reply }` → frontend **merges the patch** into Redux.
- **Partial updates work by design:** the agent returns only a *patch* of the fields it
  changed. It never emits untouched fields, so it physically cannot overwrite them.
  (This is how "batch is BMX24602" updates only the batch, leaving everything else intact.)

## LangGraph agent shape

```
message + current_form + history
        → extract_fields   (LLM → JSON patch of changed fields, {} if just a question)
        → merge            (pure Python: {**current_form, **patch})
        → assess_risk      (LLM → { severity, priority, rationale })
        → compose_reply    (LLM → natural-language reply)
        → { patch, risk, reply }
```

Document upload (PDF/TXT/EML) reuses this exact graph — we extract raw text first
and feed it in as the `message`. One code path for both entry points.

## Things we deliberately did NOT do (avoid over-engineering)

- No server-side sessions / auth — state lives in Redux and is sent each turn.
- No repository/service layers — FastAPI route talks to SQLAlchemy directly.
- No production OCR — the assignment explicitly says it is not required.
- No Docker/microservices — one backend process, one frontend dev server.

## Phase log

- **Phase 0** — scaffolding: runnable FastAPI + React/Redux skeletons, config, docs.
- **Phase 1** — Postgres (Docker) + `Complaint` table mirroring the form + `POST /complaints`
  (save) and `GET /complaints` (list). Postgres published on host port **5433** to avoid a
  clash with another Postgres already on 5432. No Alembic — one table, `create_all` is enough.
- **Phase 2** — LangGraph agent (`extract` → `merge`) behind `POST /chat`. Extractor is
  stateless (text → JSON patch); merge preserves untouched fields. Hardened: strict JSON mode,
  schema-only validation, explicit no-guessing prompt, friendly errors instead of crashes.
  Verified live: full extraction, partial update, unrelated input, no-invention, JSON validity.
- **Phase 3** — added `assess_risk` node: `extract` → `merge` → `assess_risk`. Risk *reads* the
  merged form and returns a SEPARATE `risk` object (`severity`, `priority`, `rationale`); it
  returns only the `risk` key, so it can never overwrite complaint fields. Separate from
  extraction because extraction is transcription (record only what's stated) while risk is
  judgment (an opinion) — mixing them would let opinion leak into form fields. Verified live:
  form is always exactly `current_form + patch` (risk adds nothing), and the form's
  `initial_severity` (user-stated) stays independent of `risk.severity` (AI's own call).
- **Phase 4** — document upload. `document.py` does one job (file → plain text) for PDF (pypdf),
  TXT (decode), EML (stdlib email). `POST /chat/upload` converts to text then calls the SAME
  `run_agent()` — no second AI workflow, no duplicated extraction. Unsupported types → 400;
  empty text (e.g. scanned PDF, no OCR) → friendly message. Sample fixtures live in `samples/`
  (also demo assets); reportlab was used once to build the sample PDF and is NOT a runtime dep.
- **Phase 5** — React + Redux UI (plain CSS, no UI libraries). Two slices: `complaint`
  (form + risk) and `chat` (messages + loading). Two components: `ComplaintForm` (left,
  read-only, reads form from Redux) and `Copilot` (right: upload, chat, risk, send). API
  calls live in `api.js`; components fetch then dispatch plain actions (no thunks needed).
  The form is display-only — it changes ONLY via the copilot's response, exactly as demoed.

## Bonus features (additive — no existing feature changed)

- **B1 — Completeness Checker** — pure-Python `completeness.py` (`compute_completeness`, field
  list taken from `ComplaintBase` so there's one source of truth). New graph node
  `completeness` inserted `merge → completeness → assess_risk` (no LLM). `ChatResponse` gains an
  additive `completeness: {fields, score}`. Frontend: `CompletenessCard` on the right panel,
  hidden at score 0. Verified: all prior regression tests still pass unchanged.
- **B2 — Deterministic Risk Confidence** — the risk LLM prompt is UNCHANGED. `_risk_confidence`
  (weights over risk-signal fields, sum 100) computes a 0-100 confidence in pure Python; it's
  appended to the `risk` object inside `assess_risk_node` only when risk is non-empty. No schema
  change (`risk` is a dict). Frontend shows a "Confidence: N%" line in the existing risk card.
- **B3 — Duplicate Detection** — `duplicate.py` (`find_duplicates`, deterministic, `difflib`
  fuzzy match, weights sum 100: batch 40 / product 25 / customer 20 / type 15, threshold 60).
  New read-only endpoint `POST /complaints/check-duplicate` queries PostgreSQL and compares —
  no embeddings, no vector DB, no LLM. Frontend: Save first checks; if matches, `DuplicateCard`
  warns and the button becomes "Save anyway" (warn but never block). New Redux `duplicates`
  state + `setDuplicates`/`clearDuplicates`; cleared on form change and after save.
- **B4 — Summary + Root Cause + CAPA** — ONE shared `advise` node (last in the graph) produces
  all three in a single LLM call. Runs ONLY when `patch` is non-empty (skips on unrelated chat,
  errors, empty form). When skipped it emits no advisory keys; `run_agent` returns them as
  `null`; the frontend reducer only overwrites on non-null, so previous cards are PRESERVED (no
  flicker, no lost analysis). `ChatResponse` gains additive nullable `summary`/`root_causes`/
  `capa`. Frontend: `SummaryCard` + `AdvisoryCard` on the right panel.

All six bonus features complete; every prior regression test still passes unchanged.

## Model note (important for the interview)

The assignment mandates Groq **`gemma2-9b-it`**, but Groq has **decommissioned** it
(`model_decommissioned` 400 error). We switched to the assignment's own named fallback,
**`llama-3.3-70b-versatile`**. It is a one-line change in `.env` (`GROQ_MODEL=...`) — no code
change — because the model name is read from config, never hard-coded in the agent.
