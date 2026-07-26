# AIVOA — AI-Powered Customer Complaint Management System

Two-panel complaint intake tool for pharma QMS (API & FDF). The left panel is a
**display-only** complaint form; the right panel is an **AI Copilot** that extracts
structured complaint data from pasted text or uploaded documents, auto-populates the
form, produces a risk assessment, and lets the user refine any field through chat.


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

## Project layout

```
backend/           FastAPI app
  app/
    main.py        API entry point (routes)
    config.py      reads environment variables
  requirements.txt Python dependencies
  .env.example     copy to .env and fill in
frontend/          React + Redux (Vite)
  src/
    main.jsx       React entry, wires the Redux <Provider>
    store.js       Redux store
    App.jsx        root component
```

## Running it (development)

**Backend**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit .env
uvicorn app.main:app --reload
# API at http://localhost:8000  (health check: /health)
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# UI at http://localhost:5173
```
