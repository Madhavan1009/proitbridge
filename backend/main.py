"""PROITBRIDGE FastAPI server.

Endpoints:
  GET  /clients                       — list of all clients (summary)
  GET  /clients/{client_id}           — full client data including metrics
  POST /generate-report/{client_id}   — SSE stream of agent progress + final report
  GET  /reports                       — in-memory list of generated reports
  GET  /reports/{report_id}/pdf       — download a generated PDF
  GET  /health                        — health check
"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

load_dotenv()

from agents import data_analyzer, delivery_agent, insight_agent, report_writer, reviewer_agent  # noqa: E402
from agents.llm_client import stream_chat  # noqa: E402
from agents.report_writer import build_scorecard, inject_scorecard  # noqa: E402
from pydantic import BaseModel  # noqa: E402
from data.sample_clients import (  # noqa: E402
    CLIENTS,
    channel_roi_history,
    channel_totals_by_month,
    get_client,
    list_clients_summary,
)

app = FastAPI(title="PROITBRIDGE API", version="0.1.0")

# CORS — in production set FRONTEND_ORIGIN to your Vercel URL (no trailing slash).
# Multiple origins can be comma-separated. Defaults to "*" for local dev.
_frontend_origin = os.getenv("FRONTEND_ORIGIN", "*").strip()
if _frontend_origin == "*":
    _allow_origins = ["*"]
else:
    _allow_origins = [o.strip() for o in _frontend_origin.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory report history (no DB by design).
REPORTS: List[Dict[str, Any]] = []


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_provider": "groq",
        "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "reports_generated": len(REPORTS),
    }


@app.get("/clients")
async def list_clients():
    return {"clients": list_clients_summary(), "count": len(CLIENTS)}


@app.get("/clients/{client_id}")
async def get_client_detail(client_id: str):
    client = get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    return client


@app.get("/clients/{client_id}/trends")
async def get_client_trends(client_id: str):
    """Return monthly totals and per-channel ROI history for chart rendering."""
    client = get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    return {
        "monthly_totals": channel_totals_by_month(client),
        "channel_roi_history": channel_roi_history(client),
        "periods": [h["period"] for h in client["history"]] + [client["period"]],
    }


@app.get("/reports")
async def list_reports():
    return {
        "reports": [
            {k: v for k, v in r.items() if k != "final_report"}
            for r in REPORTS
        ],
        "count": len(REPORTS),
    }


@app.get("/reports/{report_id}")
async def get_report(report_id: str):
    for r in REPORTS:
        if r["id"] == report_id:
            return r
    raise HTTPException(404, "Report not found")


@app.get("/reports/{report_id}/pdf")
async def download_pdf(report_id: str):
    for r in REPORTS:
        if r["id"] == report_id:
            pdf_path = r.get("pdf_path")
            if not pdf_path or not Path(pdf_path).exists():
                raise HTTPException(404, "PDF file missing")
            return FileResponse(
                pdf_path,
                media_type="application/pdf",
                filename=Path(pdf_path).name,
            )
    raise HTTPException(404, "Report not found")


AGENT_DEFS = [
    {"step": 1, "key": "data_analyzer", "name": "Data Analyzer",
     "description": "Crunches raw metrics, computes ROI, flags anomalies."},
    {"step": 2, "key": "insight_agent", "name": "Insight Agent",
     "description": "Turns numbers into plain-English business insights."},
    {"step": 3, "key": "report_writer", "name": "Report Writer",
     "description": "Drafts a structured executive report."},
    {"step": 4, "key": "reviewer_agent", "name": "Reviewer",
     "description": "Polishes prose, verifies numbers, sharpens recommendations."},
    {"step": 5, "key": "delivery_agent", "name": "Delivery Agent",
     "description": "Generates PDF and emails it to the client."},
]


def _sse(event: str, payload: Dict[str, Any]) -> Dict[str, str]:
    return {"event": event, "data": json.dumps(payload)}


@app.post("/generate-report/{client_id}")
async def generate_report(client_id: str, request: Request):
    client = get_client(client_id)
    if not client:
        raise HTTPException(404, "Client not found")

    report_id = uuid.uuid4().hex[:12]

    async def event_stream():
        try:
            yield _sse("run_start", {
                "report_id": report_id,
                "client_id": client_id,
                "client_name": client["name"],
                "agents": AGENT_DEFS,
                "started_at": datetime.utcnow().isoformat() + "Z",
            })

            # --- Agent 1: Data Analyzer
            yield _sse("agent_update", {"agent": "Data Analyzer", "status": "running", "step": 1})
            analysis = await data_analyzer.run(client)
            yield _sse("agent_update", {
                "agent": "Data Analyzer", "status": "complete", "step": 1,
                "preview": {
                    "top_channel": analysis.get("top_channel"),
                    "overall_roi": analysis.get("overall_roi"),
                },
            })

            # --- Agent 2: Insight Agent
            yield _sse("agent_update", {"agent": "Insight Agent", "status": "running", "step": 2})
            insights = await insight_agent.run(analysis, client)
            yield _sse("agent_update", {
                "agent": "Insight Agent", "status": "complete", "step": 2,
                "preview": insights[:240] + ("..." if len(insights) > 240 else ""),
            })

            # --- Agent 3: Report Writer
            yield _sse("agent_update", {"agent": "Report Writer", "status": "running", "step": 3})
            draft = await report_writer.run(insights, analysis, client)
            yield _sse("agent_update", {
                "agent": "Report Writer", "status": "complete", "step": 3,
                "preview": f"Draft length: {len(draft):,} chars",
            })

            # --- Agent 4: Reviewer
            yield _sse("agent_update", {"agent": "Reviewer", "status": "running", "step": 4})
            reviewed = await reviewer_agent.run(draft, analysis)
            # Inject the deterministic Channel Scorecard table AFTER the reviewer,
            # so neither model can corrupt the per-channel $ values.
            final_report = inject_scorecard(
                reviewed,
                build_scorecard(client["metrics"], analysis.get("channel_trend")),
            )
            yield _sse("agent_update", {
                "agent": "Reviewer", "status": "complete", "step": 4,
                "preview": f"Final length: {len(final_report):,} chars",
            })

            # --- Agent 5: Delivery
            yield _sse("agent_update", {"agent": "Delivery Agent", "status": "running", "step": 5})
            delivery = await delivery_agent.run(final_report, client, analysis)
            yield _sse("agent_update", {
                "agent": "Delivery Agent", "status": "complete", "step": 5,
                "preview": {
                    "email_status": delivery["email_status"],
                    "pdf_ready": True,
                },
            })

            record = {
                "id": report_id,
                "client_id": client_id,
                "client_name": client["name"],
                "report_type": client["report_type"],
                "period": client["period"],
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "analysis": analysis,
                "final_report": final_report,
                "pdf_path": delivery["pdf_path"],
                "pdf_url": f"/reports/{report_id}/pdf",
                "email_status": delivery["email_status"],
                "email_detail": delivery["email_detail"],
            }
            REPORTS.append(record)

            yield _sse("run_complete", {
                "report_id": report_id,
                "pdf_url": f"/reports/{report_id}/pdf",
                "email_status": delivery["email_status"],
                "final_report": final_report,
                "analysis": analysis,
                "client": {
                    "id": client["id"],
                    "name": client["name"],
                    "industry": client["industry"],
                    "contact_name": client["contact_name"],
                    "contact_email": client["contact_email"],
                    "logo_color": client["logo_color"],
                    "report_type": client["report_type"],
                    "period": client["period"],
                },
            })
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            yield _sse("run_error", {"report_id": report_id, "error": str(e)})

    return EventSourceResponse(event_stream())


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    report_id: str
    messages: list[ChatMessage]


CHAT_SYSTEM_PROMPT = """You are a senior marketing analyst at PROITBRIDGE. You are talking with the account manager who just received the monthly report below. Answer their follow-up questions concisely.

RULES
- Ground every claim in the report or the analysis JSON. If asked about something not in the data, say so plainly.
- Cite specific numbers (with $ signs, % signs, x for ROI multipliers).
- For "what if" questions, do simple linear projections from the current ROI per channel. Always show your math in one short line.
- Keep responses under 6 sentences unless the user asks for more detail.
- Use markdown sparingly — bold for key numbers, bullet lists only when the user asks for a list.
- No filler ("great question", "happy to help"). Just answer.
"""


@app.post("/chat")
async def chat(req: ChatRequest):
    report = next((r for r in REPORTS if r["id"] == req.report_id), None)
    if not report:
        raise HTTPException(404, "Report not found — generate a report first.")

    client = get_client(report["client_id"])
    context_block = (
        f"## CLIENT\n{client['name']} — {client['industry']} — {client['period']}\n\n"
        f"## RAW METRICS (current month)\n{json.dumps(client['metrics'], indent=2)}\n\n"
        f"## ANALYSIS (deterministic totals + trends)\n{json.dumps(report['analysis'], indent=2)}\n\n"
        f"## FINAL REPORT\n{report['final_report']}\n"
    )

    chat_messages = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT + "\n\n" + context_block},
    ] + [{"role": m.role, "content": m.content} for m in req.messages]

    async def event_stream():
        try:
            async for delta in stream_chat(chat_messages, temperature=0.4):
                yield _sse("chat_delta", {"delta": delta})
            yield _sse("chat_done", {})
        except Exception as e:  # noqa: BLE001
            yield _sse("chat_error", {"error": str(e)})

    return EventSourceResponse(event_stream())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
