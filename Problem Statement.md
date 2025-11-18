# Full-Stack Take-Home Assignment (3 hours)

## 🎯 Goal

Build a small full-stack application that:

- Uses **PostgreSQL** as a database
- Exposes a **backend with a LangGraph-based agent** that can reason over data
- Provides a **simple UI** so a user can interact with the agent
- **Runs end-to-end via Docker/Docker Compose**
- **Is easy to run** using a clear README

### What We Want to See

- ✅ How you structure code (backend, frontend, infra)
- ✅ How you model data and use Postgres
- ✅ How you work with LangGraph to build a small agentic flow
- ✅ How you commit over time (small, meaningful commits that show progress)

**Expected Timeline:** ~3 hours (prioritize pragmatically, document tradeoffs)

---

## 📋 Product: "Support Ticket Analyst"

Build a tiny tool for a fictional SaaS company that wants an AI assistant to help understand support tickets.

### Core User Story

**As a user (no auth needed), I can:**

1. **Upload or type in** several "support tickets" into the system
2. **Click a button** that asks an AI agent to:
   - Summarize the tickets
   - Categorize each ticket by topic (e.g., billing, bug, feature request)
   - Propose a priority (e.g., low / medium / high)
3. **See the AI's results** in the UI, pulled from the backend (not hardcoded) and persisted in Postgres

---

## 📊 Requirements

### 1. Data Model (PostgreSQL)

Use Postgres as your primary database. Minimum schema:

#### `tickets` table
```
id (primary key)
title (text)
description (text)
created_at (timestamp)
```

#### `analysis_runs` table
```
id (primary key)
created_at (timestamp)
summary (text) – overall summary from the agent
```

#### `ticket_analysis` table (link table between a run and individual tickets)
```
id (primary key)
analysis_run_id (FK → analysis_runs)
ticket_id (FK → tickets)
category (text)
priority (text)
notes (text, optional) – extra explanation by the agent
```

**Migration:** Use any approach (SQL files, migration tool, etc.) as long as it's reproducible via Docker.

---

### 2. Backend (API + LangGraph Agent)

**Tech Stack:** Node/TypeScript or Python (your choice)

#### LangGraph Agent Requirements

Build a small agent that:
- Reads tickets from Postgres
- For each analysis run:
  - Creates or updates an entry in `analysis_runs`
  - For each ticket:
    - Calls a model/tool via LangGraph to infer: category, priority, optional explanation/notes
    - Writes results into `ticket_analysis`

**What We Want to See:**
- ✅ Clear LangGraph setup (graph definition, nodes/tools, execution)
- ✅ Separation between "graph logic" and "DB access" code
- ✅ Proper state management across nodes

#### API Endpoints (Suggested)

**POST `/api/tickets`**
- Body: `[{ title: string; description: string }, ...]`
- Behavior: Inserts tickets into Postgres, returns inserted tickets

**POST `/api/analyze`**
- Body: (optional) `{ ticketIds: number[] }`
- Behavior:
  - If `ticketIds` provided: analyze only those
  - Otherwise: analyze all tickets
  - Creates `analysis_runs` row and corresponding `ticket_analysis` rows via LangGraph
  - Returns created `analysis_run` and per-ticket analysis

**GET `/api/analysis/latest`**
- Behavior: Returns latest `analysis_run` + its `ticket_analysis` entries joined with ticket data

**Note:** You can tweak these, but keep the structure understandable.

**LLM Note:** If you don't have access to a real LLM key, you can stub/mimic the LangGraph "model call" layer with deterministic logic (e.g., simple rules based on keywords). **Mention this clearly in the README.**

---

### 3. LangGraph Agent

The agent should be simple but must actually use LangGraph.

#### Expected Structure

A graph with:
- A **node that fetches tickets**
- A **node that calls a model/tool** to categorize and prioritize each ticket
- A **node that writes back to the database**
- Some **minimal state** (e.g., tickets to process, partial results, run id)

#### We Care About

- ✅ How you structure the graph
- ✅ How you pass context/state
- ✅ How you handle DB I/O in the flow

---

### 4. UI (Simple, but Real)

**Tech Stack:** React is a plus; any frontend stack is acceptable

#### Must-Have Features

**Create Tickets**
- Small form (title + description) with an "Add ticket" button

**Show List of Existing Tickets**
- Display title and maybe truncated description

**Trigger Analysis**
- "Analyze tickets" button
- When clicked:
  - Call `/api/analyze`
  - Show loading state while analysis is running

**View Results**
- Show the latest analysis:
  - Overall summary from `analysis_runs.summary`
  - For each ticket:
    - title
    - category
    - priority
    - notes (if any)

#### Nice-to-Haves (if time permits)
- ✅ Select specific tickets to analyze
- ✅ Some very light styling for readability

---

### 5. Docker & Dev Experience

We want the project to be easy to run locally.

#### Docker Compose Setup

Orchestrate:
- `db` service – PostgreSQL
- `backend` service – API + LangGraph agent
- `frontend` service – UI (if separate)

Alternatively, serve static frontend from backend, but still containerize.

#### Expected Workflow

```bash
docker compose up --build
```

Should result in:
- ✅ Postgres running with the right schema
- ✅ Backend up and reachable
- ✅ Frontend accessible at a port (e.g., http://localhost:3000 or http://localhost:8080)

#### Migrations/Seeding

Wire into either:
- Container startup, or
- A simple command like: `docker compose run backend npm run migrate`

---

### 6. README

Include a `README.md` at the project root with:

#### Quickstart
- Prerequisites (Docker, Docker Compose)
- How to run the whole project
- Default ports (frontend, backend, db)

#### Configuration
- How environment variables are set (e.g., `.env`, `.env.example`)
- How the backend connects to Postgres
- How LangGraph / LLM is configured (e.g., API keys, or explanation of stubbed model)

#### API Overview
- Brief description of endpoints and request/response shape
- Any non-obvious details

#### Architecture Notes
- Tech choices (language/frameworks)
- Directory structure
- How the LangGraph agent is wired to Postgres
- Any tradeoffs or shortcuts made due to time constraints

#### Future Improvements
- Bullet list of what you'd do with more time (error handling, tests, metrics, etc.)

---

### 7. Git / Commit History

**Use meaningful, incremental commits:**

- ✅ Not a single giant "initial commit"
- ✅ Commit as you go to show your thought process
- ✅ Example commits:
  - "Initialize backend + LangGraph skeleton"
  - "Add ticket schema + migrations"
  - "Implement /api/analyze endpoint"
  - "Add React UI for ticket list"

**We're Looking At:**
- ✅ How you structure changes
- ✅ How you name commits
- ✅ Whether the sequence of commits tells a coherent story

---

## 📦 Deliverables

When complete, send:

### Required
- Link to GitHub repo (or similar) containing:
  - Source code (backend, frontend, infra)
  - `docker-compose.yml`
  - `README.md`

### Optional but Nice
- A short note in the README with:
  - Estimate of how much time you actually spent
  - What you would do next with more time

---

## Summary Checklist

- [ ] PostgreSQL schema: tickets, analysis_runs, ticket_analysis
- [ ] Backend API: /api/tickets, /api/analyze, /api/analysis/latest
- [ ] LangGraph agent with 3+ nodes + clear state management
- [ ] React UI for creating tickets, triggering analysis, viewing results
- [ ] Docker Compose orchestration (db, backend, frontend)
- [ ] Auto-migration and seeding on startup
- [ ] Comprehensive README with quickstart, config, and architecture notes
- [ ] Meaningful, incremental git commits
- [ ] All code properly documented with docstrings/comments
