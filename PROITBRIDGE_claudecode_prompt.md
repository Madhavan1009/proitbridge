# PROITBRIDGE — Claude Code Master Prompt
# Paste this entire prompt into Claude Code to start building

---

## PROJECT OVERVIEW

Build a full-stack web application called **PROITBRIDGE** — an AI-powered Client Report Automation System.

This app allows marketing agency managers to select a client, click "Generate Report", watch 5 AI agents work in real-time, and automatically receive a professional PDF report via email — fully automated, no manual work.

---

## TECH STACK

### Frontend
- React + Vite
- Tailwind CSS
- Axios (API calls)
- Deploy target: Netlify

### Backend
- Python + FastAPI
- Claude API (Anthropic) — model: claude-sonnet-4-20250514
- ReportLab (PDF generation)
- Resend (email sending)
- Uvicorn (server)
- Deploy target: Render

### No database needed — all sample data hardcoded in Python

---

## FOLDER STRUCTURE TO CREATE

```
proitbridge/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ClientCard.jsx
│   │   │   ├── AgentTimeline.jsx
│   │   │   ├── ReportPreview.jsx
│   │   │   └── MetricsTable.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ClientDetail.jsx
│   │   │   └── ReportHistory.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── backend/
    ├── main.py
    ├── agents/
    │   ├── __init__.py
    │   ├── data_analyzer.py
    │   ├── insight_agent.py
    │   ├── report_writer.py
    │   ├── reviewer_agent.py
    │   └── delivery_agent.py
    ├── data/
    │   ├── __init__.py
    │   └── sample_clients.py
    ├── services/
    │   ├── __init__.py
    │   ├── pdf_generator.py
    │   └── email_sender.py
    ├── requirements.txt
    └── .env.example
```

---

## SAMPLE DATA — 3 CLIENTS (hardcode in backend/data/sample_clients.py)

```python
CLIENTS = {
    "novaspark": {
        "id": "novaspark",
        "name": "NovaSpark Digital",
        "industry": "E-commerce",
        "contact_name": "Sarah Johnson",
        "contact_email": "sarah@novaspark.com",
        "logo_color": "#6366f1",
        "report_type": "Monthly Marketing Report",
        "period": "May 2026",
        "metrics": {
            "google_ads": {
                "impressions": 120000,
                "clicks": 3200,
                "conversions": 180,
                "spend": 4200,
                "revenue": 18000
            },
            "instagram_ads": {
                "impressions": 85000,
                "clicks": 1100,
                "conversions": 42,
                "spend": 2100,
                "revenue": 4800
            },
            "email_campaign": {
                "impressions": 12000,
                "clicks": 980,
                "conversions": 210,
                "spend": 300,
                "revenue": 22000
            },
            "seo_organic": {
                "impressions": 45000,
                "clicks": 2800,
                "conversions": 95,
                "spend": 0,
                "revenue": 9500
            }
        }
    },
    "bluepeak": {
        "id": "bluepeak",
        "name": "BluePeak Finance",
        "industry": "Fintech",
        "contact_name": "James Miller",
        "contact_email": "james@bluepeak.io",
        "logo_color": "#0ea5e9",
        "report_type": "Monthly Marketing Report",
        "period": "May 2026",
        "metrics": {
            "google_ads": {
                "impressions": 95000,
                "clicks": 2800,
                "conversions": 140,
                "spend": 5500,
                "revenue": 28000
            },
            "linkedin_ads": {
                "impressions": 40000,
                "clicks": 900,
                "conversions": 65,
                "spend": 3200,
                "revenue": 19500
            },
            "email_campaign": {
                "impressions": 8000,
                "clicks": 620,
                "conversions": 98,
                "spend": 200,
                "revenue": 14700
            },
            "seo_organic": {
                "impressions": 32000,
                "clicks": 1900,
                "conversions": 72,
                "spend": 0,
                "revenue": 10800
            }
        }
    },
    "greenleaf": {
        "id": "greenleaf",
        "name": "GreenLeaf Health",
        "industry": "Healthcare SaaS",
        "contact_name": "Priya Patel",
        "contact_email": "priya@greenleafhealth.com",
        "logo_color": "#10b981",
        "report_type": "Monthly Marketing Report",
        "period": "May 2026",
        "metrics": {
            "google_ads": {
                "impressions": 67000,
                "clicks": 1800,
                "conversions": 95,
                "spend": 3100,
                "revenue": 12400
            },
            "facebook_ads": {
                "impressions": 54000,
                "clicks": 1200,
                "conversions": 48,
                "spend": 1800,
                "revenue": 6200
            },
            "email_campaign": {
                "impressions": 9500,
                "clicks": 740,
                "conversions": 125,
                "spend": 150,
                "revenue": 16250
            },
            "seo_organic": {
                "impressions": 28000,
                "clicks": 1500,
                "conversions": 60,
                "spend": 0,
                "revenue": 7800
            }
        }
    }
}
```

---

## BACKEND — 5 AGENTS (each calls Claude API separately)

### Agent 1: Data Analyzer (backend/agents/data_analyzer.py)
- Input: raw client metrics dict
- Task: analyze the numbers, calculate ROI per channel, find top performer, find underperformer, detect anomalies
- Output: structured JSON with analysis results
- Claude prompt: "You are a data analyst. Analyze this marketing data and return a JSON with: top_channel, underperforming_channel, total_spend, total_revenue, overall_roi, channel_roi (dict), anomalies (list), key_findings (list of 3). Return only valid JSON."

### Agent 2: Insight Agent (backend/agents/insight_agent.py)
- Input: analysis JSON from Agent 1
- Task: convert numbers into plain English business insights
- Output: 4-5 insight paragraphs written professionally
- Claude prompt: "You are a marketing strategist. Convert this data analysis into clear business insights for a client report. Write 4 concise insight paragraphs covering: overall performance, best channel, worst channel, and one strategic recommendation. Be specific with numbers."

### Agent 3: Report Writer (backend/agents/report_writer.py)
- Input: insights from Agent 2 + client info
- Task: write a complete structured professional report
- Output: full report text with sections
- Claude prompt: "You are a professional report writer at PROITBRIDGE agency. Write a complete monthly marketing report for [client_name]. Include: Executive Summary, Performance Overview, Channel Analysis, Key Insights, Strategic Recommendations, Next Steps. Use professional tone. Include specific metrics."

### Agent 4: Reviewer Agent (backend/agents/reviewer_agent.py)
- Input: full report from Agent 3 + original data
- Task: review for accuracy, clarity, completeness
- Output: final polished report text
- Claude prompt: "You are a senior marketing consultant reviewing this report. Check that all numbers match the data, remove vague statements, sharpen recommendations, ensure executive-level quality. Return the final improved report text only."

### Agent 5: Delivery Agent (backend/agents/delivery_agent.py)
- Input: final report + client info
- Task: trigger PDF generation + send email
- Output: confirmation with PDF path and email status
- This agent calls pdf_generator.py and email_sender.py services

---

## BACKEND API ENDPOINTS (backend/main.py)

```
GET  /clients              → returns list of all 3 clients with basic info
GET  /clients/{client_id}  → returns full client data including metrics
POST /generate-report/{client_id} → triggers all 5 agents, returns report + status
GET  /reports              → returns list of all generated reports (in-memory list)
GET  /health               → health check endpoint
```

### Streaming Support
The `/generate-report/{client_id}` endpoint must use **Server-Sent Events (SSE)** to stream agent progress in real-time to the frontend. Each agent completion sends an event:

```
event: agent_update
data: {"agent": "Data Analyzer", "status": "complete", "step": 1}

event: agent_update  
data: {"agent": "Insight Agent", "status": "complete", "step": 2}

... and so on until step 5
```

---

## FRONTEND PAGES & COMPONENTS

### Dashboard Page (src/pages/Dashboard.jsx)
- Header with PROITBRIDGE logo and tagline "Automated Client Intelligence"
- 3 client cards showing: client name, industry, last report date, "Generate Report" button
- Sidebar with navigation: Dashboard, Reports History
- Stats bar at top: Total Clients (3), Reports Generated, Emails Sent

### Client Detail Page (src/pages/ClientDetail.jsx)
- Client header with name, industry, contact
- Metrics table showing all channels with: impressions, clicks, conversions, spend, revenue, ROI
- "Generate Report" button — prominent, primary color
- Agent Timeline component (shown when generating)
- Report Preview section (shown after generation)

### Agent Timeline Component (src/components/AgentTimeline.jsx)
- Shows 5 agents in vertical timeline
- Each agent has: icon, name, description, status indicator
- Status: waiting (grey) → running (blue, animated pulse) → complete (green checkmark)
- Fires in sequence as SSE events come in from backend
- This is the MOST IMPORTANT component visually — make it look impressive

### Report Preview Component (src/components/ReportPreview.jsx)
- Shows generated report text in a clean document-style container
- Download PDF button
- "Email Sent" confirmation badge
- Timestamp of generation

### MetricsTable Component (src/components/MetricsTable.jsx)
- Clean table with channel rows
- Color-coded ROI column (green = good, red = poor)
- Total row at bottom

---

## UI DESIGN REQUIREMENTS

- Color scheme: Dark sidebar (#0f172a) + White main content + Indigo accent (#6366f1)
- Font: Inter (Google Fonts)
- PROITBRIDGE logo: Text-based, "PROIT" in indigo + "BRIDGE" in white, sidebar top
- Agent timeline must have animated pulse on active agent
- Clean, professional, SaaS-like — not colorful or playful
- Fully responsive

---

## ENV VARIABLES NEEDED

```
# backend/.env
ANTHROPIC_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
FROM_EMAIL=reports@proitbridge.com
```

---

## requirements.txt

```
fastapi
uvicorn
anthropic
resend
reportlab
python-dotenv
sse-starlette
httpx
```

---

## IMPORTANT INSTRUCTIONS FOR CLAUDE CODE

1. Build backend first — all 5 agents, FastAPI server, sample data
2. Test each agent individually before connecting
3. Then build frontend — start with Dashboard, then ClientDetail, then AgentTimeline
4. Connect frontend to backend via Axios
5. Make sure SSE streaming works end to end
6. PDF must download properly from frontend
7. Add CORS middleware in FastAPI for local dev
8. All agent steps must be visible in UI — this is the core demo moment
9. Use async/await throughout FastAPI
10. Keep code clean, commented, production-style

---

## START COMMAND

Say this to Claude Code to begin:
"Read this entire prompt and start building the PROITBRIDGE project. Begin with the backend — create the folder structure, sample data, all 5 agents, and the FastAPI server with SSE streaming. Then build the frontend React dashboard."
