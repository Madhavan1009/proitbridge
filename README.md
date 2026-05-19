# PROITBRIDGE — Automated Client Intelligence

AI-powered client report automation for marketing agencies. Pick a client, click **Generate Report**, watch 5 AI agents work in real time, and receive a polished PDF report by email — fully automated.

## Architecture

```
┌──────────────────────┐        SSE         ┌──────────────────────────┐
│ React + Vite + Tail  │  ◄───────────────  │ FastAPI + sse-starlette  │
│  (frontend, :5173)   │  ──── REST ─────►  │       (backend, :8000)   │
└──────────────────────┘                    └────────────┬─────────────┘
                                                         │
                                  ┌──────────────────────┼───────────────────────┐
                                  ▼                      ▼                       ▼
                            Gemini 2.0 Flash      ReportLab (PDF)         Resend (email)
                             (5 agents)
```

**5-agent pipeline** (sequential, each calls Gemini):

1. **Data Analyzer** — raw metrics → structured JSON (ROI, anomalies, key findings)
2. **Insight Agent** — JSON → 4 plain-English insight paragraphs
3. **Report Writer** — insights → full markdown report (6 sections)
4. **Reviewer** — verifies numbers, sharpens prose, polishes
5. **Delivery Agent** — builds PDF, sends email

The LLM provider is wrapped in `backend/agents/llm_client.py` — switching to Anthropic Claude or another provider later is a single-file change.

## Prerequisites

- Python 3.10+
- Node.js 18+
- A free Gemini API key — https://aistudio.google.com/app/apikey
- (Optional) A Resend API key for real email delivery — https://resend.com

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env and paste your GEMINI_API_KEY
python main.py
```

The API will be live at http://localhost:8000. Quick sanity checks:

- http://localhost:8000/health
- http://localhost:8000/clients

If `RESEND_API_KEY` is unset, the Delivery Agent runs in demo mode (PDF is still generated, email step is skipped with status `skipped`).

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api/*` → `http://localhost:8000`, so no extra config needed for local dev.

## Generating a report

1. Open the dashboard, pick a client (e.g. NovaSpark Digital).
2. Click **Generate Report**.
3. Watch the 5-agent timeline fill in live as SSE events arrive.
4. The final report appears below with a **Download PDF** button. If Resend is configured, the PDF is also emailed to the client contact.

Generated PDFs are written to `backend/generated_reports/` and served by `GET /reports/{report_id}/pdf`.

## API endpoints

| Method | Path                              | Purpose                                   |
| ------ | --------------------------------- | ----------------------------------------- |
| GET    | `/health`                         | Health + LLM provider info                |
| GET    | `/clients`                        | List all clients (summary)                |
| GET    | `/clients/{client_id}`            | Full client incl. metrics                 |
| POST   | `/generate-report/{client_id}`    | **SSE stream**: agent progress + report   |
| GET    | `/reports`                        | In-memory list of generated reports       |
| GET    | `/reports/{report_id}`            | Full report record (includes report text) |
| GET    | `/reports/{report_id}/pdf`        | Download the PDF                          |

### SSE event types

```
event: run_start       data: { report_id, client_name, agents, started_at }
event: agent_update    data: { agent, status, step, preview? }   # status: running | complete
event: run_complete    data: { report_id, pdf_url, final_report, analysis, client, email_status }
event: run_error       data: { report_id, error }
```

## Deployment

- **Frontend → Netlify**: `npm run build`, deploy `frontend/dist`. Set `VITE_API_BASE` to the backend URL (no trailing slash).
- **Backend → Render**: Web Service, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set `GEMINI_API_KEY` (and optionally `RESEND_API_KEY`, `FROM_EMAIL`).

## Swapping the LLM provider

The agents only know about `agents.llm_client.generate(prompt)`. To move off Gemini:

1. Add the new SDK to `requirements.txt`.
2. Replace the body of `generate()` in `backend/agents/llm_client.py`.
3. Update the env var name in `.env.example`.

No agent code changes needed.

## Project layout

```
proitbridge/
├── backend/
│   ├── main.py                       # FastAPI app + SSE endpoint
│   ├── agents/
│   │   ├── llm_client.py             # Gemini wrapper (provider-swap point)
│   │   ├── data_analyzer.py          # Agent 1
│   │   ├── insight_agent.py          # Agent 2
│   │   ├── report_writer.py          # Agent 3
│   │   ├── reviewer_agent.py         # Agent 4
│   │   └── delivery_agent.py         # Agent 5
│   ├── services/
│   │   ├── pdf_generator.py          # ReportLab builder
│   │   └── email_sender.py           # Resend client (gracefully no-ops in demo mode)
│   ├── data/sample_clients.py        # 3 hardcoded clients
│   ├── generated_reports/            # PDFs land here (gitignored)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/               # Sidebar, ClientCard, MetricsTable, AgentTimeline, ReportPreview
    │   ├── pages/                    # Dashboard, ClientDetail, ReportHistory
    │   ├── lib/api.js                # Axios + SSE stream parser
    │   ├── App.jsx, main.jsx, index.css
    ├── index.html
    ├── vite.config.js                # /api proxy → :8000
    ├── tailwind.config.js
    └── package.json
```
