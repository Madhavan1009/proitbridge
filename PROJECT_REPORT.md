# PROITBRIDGE — Project Report

> **Automated Client Intelligence**
> Five AI agents that turn raw marketing metrics into branded monthly client reports, automatically.

---

## 1. Executive summary

**PROITBRIDGE** is a full-stack web application that automates the most repetitive, time-consuming task at any marketing agency: producing the **monthly performance report** that has to be written, designed, reviewed, exported as a PDF, and emailed to each client.

What normally takes an account manager 2–4 hours per client now takes **under one minute, zero manual work**. Five AI agents work in sequence — analyzing data, writing insights, drafting a report, reviewing it, and delivering a branded PDF to the client's inbox — while the agency manager watches the pipeline complete in real time.

The application is production-deployable today (Render for the API, Vercel for the UI) and runs on a stack chosen so the *entire* monthly cost can stay at **$0** at small volumes (Groq free tier, Resend free tier, Render free instance, Vercel hobby).

---

## 2. The problem

In a typical marketing agency, every client expects a **monthly performance report** covering paid ads, organic search, email, and social. For each client, the account manager has to:

1. Pull metrics from 4–6 different platforms (Google Ads, Meta, LinkedIn, GA4, SEO tools, email platform).
2. Calculate ROI per channel, identify wins and losers, spot anomalies.
3. Write a coherent executive narrative — Highlights, Performance Overview, Channel Analysis, Recommendations.
4. Format it as a polished PDF that matches the agency's branding.
5. Email it to the client contact with a personalised cover note.
6. Repeat for every client. Every month.

For an agency with **20 clients**, that's **40–80 hours/month** of pure reporting work — billable time the agency could be spending on strategy and client growth instead. Worse, reports vary in quality because they're written by different account managers under deadline pressure.

**PROITBRIDGE removes that whole loop.**

---

## 3. The solution

PROITBRIDGE takes the raw marketing data for a client and runs it through a **five-agent pipeline**, each agent doing one tight job:

| # | Agent          | Job                                                                                         |
| - | -------------- | ------------------------------------------------------------------------------------------- |
| 1 | Data Analyzer  | Crunches raw channel metrics. Computes ROI per channel, blended ROI, MoM growth, flags anomalies. Outputs structured JSON. |
| 2 | Insight Agent  | Converts the JSON into 4 plain-English business insight paragraphs.                          |
| 3 | Report Writer  | Drafts the full report — Highlights, Performance Snapshot, Channel Scorecard, What Worked vs. What Didn't, Recommended Actions, Looking Ahead. |
| 4 | Reviewer       | Verifies every number against the source data, removes filler, sharpens recommendations.    |
| 5 | Delivery Agent | Generates a branded PDF (ReportLab), emails it to the client contact (Resend), returns the artefact URL. |

The pipeline streams its progress to the browser via **Server-Sent Events** — the agency manager watches each agent light up green as it completes. When the last agent finishes, the polished report appears on screen and a chat box opens so the manager can ask follow-up questions ("What if we doubled email spend?", "Why is Facebook underperforming?"). The PDF is downloadable from the same screen and has already been emailed to the client.

> Arithmetic (totals, ROI, channel-level math, the scorecard table) is computed deterministically in Python — never by the LLM — so the numbers in the report are guaranteed to match the source data. This is critical for client trust.

---

## 4. Who is this for?

### Primary persona — Agency Account Manager

> *"I have 12 clients. End of month is hell. I spend three days just doing reports."*

The person who clicks **Generate Report** for each client every month. PROITBRIDGE replaces three days of work with three minutes of clicks.

**Value delivered:** time back, consistent quality across the entire client roster, real numbers instead of hand-typed (and occasionally wrong) ones.

### Secondary persona — Agency Owner / Operations Lead

> *"I want my team writing strategy decks, not reformatting Google Ads screenshots."*

Cares about throughput. With PROITBRIDGE, the same five-person agency team can comfortably service 2–3× more clients without growing headcount.

**Value delivered:** higher gross margin per client; the reporting bottleneck is gone.

### Tertiary persona — The Client (the recipient)

> *"I get a clean, on-brand PDF on the first of every month. I can act on it without scheduling a call."*

Doesn't interact with PROITBRIDGE directly — they just receive better, more consistent reports in their inbox.

**Value delivered:** higher perceived professionalism from the agency.

---

## 5. What's automated — end-to-end walkthrough

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AGENCY MANAGER                                  │
│  Opens dashboard → picks a client → clicks "Generate Report"            │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FASTAPI BACKEND  (POST /generate-report/{client_id})                   │
│  Opens an SSE stream and runs the 5-agent pipeline:                     │
│                                                                         │
│   1. Data Analyzer   ───►  Groq Llama 3.3 70B  ───►  structured JSON   │
│      + deterministic Python overrides totals/ROI/MoM                   │
│                                                                         │
│   2. Insight Agent   ───►  Groq Llama 3.3 70B  ───►  4 paragraphs      │
│                                                                         │
│   3. Report Writer   ───►  Groq Llama 3.3 70B  ───►  markdown draft    │
│      + deterministic Channel Scorecard table injection                 │
│                                                                         │
│   4. Reviewer        ───►  Groq Llama 3.3 70B  ───►  final markdown    │
│                                                                         │
│   5. Delivery Agent  ───►  ReportLab           ───►  branded PDF       │
│                      ───►  Resend API          ───►  email sent        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │  SSE: agent_update events per step
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REACT FRONTEND                                                         │
│  • Agent Timeline updates live as each step completes                   │
│  • Final report renders inline (markdown → HTML with tables/bullets)    │
│  • Download PDF button + "Email sent" badge appear                      │
│  • Chat panel opens → manager can ask follow-up questions               │
└─────────────────────────────────────────────────────────────────────────┘
```

End-to-end latency from button click to email-delivered: **~30–45 seconds**.

---

## 6. Technical architecture

### Frontend
- **React 18 + Vite + Tailwind CSS**
- **react-router-dom v6** — `/` landing page, `/dashboard`, `/clients/:id`, `/reports`
- **recharts** — ROI bar chart, revenue donut, 5-month trend line
- **Custom SSE parser** — `fetch` + `ReadableStream` (the native `EventSource` API only supports GET; we need POST for the generate-report and chat endpoints)
- Deploy target: **Vercel**

### Backend
- **Python 3.11 + FastAPI + Uvicorn**
- **sse-starlette** — Server-Sent Events
- **groq** SDK — LLM provider (free tier, OpenAI-compatible API)
- **ReportLab** — PDF generation with native Drawing primitives for the branded header
- **Resend** — transactional email with PDF attachment
- **python-dotenv** — local env loading
- Deploy target: **Render** (free tier web service)

### Why this stack
- **No database.** Reports live in an in-memory list for the session. This keeps deploy trivial and is fine for a demo / small-volume use. Roadmap section covers persistence.
- **No queue / worker.** The generate-report endpoint runs the whole pipeline synchronously inside the SSE response. Render's free tier sleeps after 15 min of inactivity but cold-starts in ~30s; first generation after sleep is slow, subsequent ones are instant.
- **Provider-agnostic LLM wrapper** — every agent calls `agents.llm_client.generate(prompt)`. Swapping Groq → Anthropic Claude or Gemini is a one-file change. We started on Gemini, hit free-tier quota issues, and moved to Groq in ~15 minutes.

### Data flow
- Sample data for **3 clients** (NovaSpark, BluePeak, GreenLeaf) is hardcoded in `backend/data/sample_clients.py`.
- Each client has a **current month** (May 2026) and **4 months of history** (deterministically generated from the current month via a seeded backward walk).
- The history powers MoM comparisons, trend arrows in the scorecard (📈 / 📉 / →), and the 5-month trend chart on the client detail page.

---

## 7. Features (today)

| Feature                          | Status | Notes                                                              |
| -------------------------------- | ------ | ------------------------------------------------------------------ |
| 5-agent pipeline                 | ✅     | All agents grounded; arithmetic is deterministic                   |
| Live SSE streaming               | ✅     | Agent timeline updates in real time                                |
| Branded PDF generation           | ✅     | Native ReportLab globe + cyan wordmark header                      |
| Auto email delivery              | ✅     | Resend with PDF attachment; graceful fallback if not configured    |
| Chat with the report             | ✅     | Streaming, grounded in report + analysis + raw metrics             |
| Multi-month historical data      | ✅     | 5 months per client; powers MoM and trend visuals                  |
| Interactive charts               | ✅     | ROI bar, revenue donut, 5-month trend line                         |
| Animated counters                | ✅     | All dashboard KPIs count-up on load                                |
| Channel Scorecard table          | ✅     | Deterministically built; verdict + trend arrow per channel         |
| Reports history page             | ✅     | In-memory list; survives client-side navigation                    |
| Marketing landing page           | ✅     | Hero, pipeline visualisation, capability cards, "How it works"     |
| Mobile responsive                | ⚠️     | Works on tablet; desktop is the primary form factor                |
| Authentication                   | ❌     | Single-tenant. See roadmap.                                        |
| Persistence (DB)                 | ❌     | In-memory. See roadmap.                                            |
| Real channel API integrations    | ❌     | Sample data only. See roadmap.                                     |

---

## 8. Cost profile (current deployment)

| Component        | Service       | Tier    | Cost            |
| ---------------- | ------------- | ------- | --------------- |
| Frontend hosting | Vercel        | Hobby   | $0              |
| Backend hosting  | Render        | Free    | $0 (sleeps when idle) |
| LLM              | Groq          | Free    | $0 (~30 RPM, ~14k RPD) |
| Email            | Resend        | Free    | $0 (3,000 emails/month) |
| **Total**        |               |         | **$0/month**    |

This stack scales to ~500 reports/month before hitting any limit. To go beyond:
- Render → Starter ($7/mo, no sleep)
- Groq → Dev tier (~$0.50 per 1M tokens — at ~5k tokens/report that's $0.0025/report)
- Resend → Pro ($20/mo, 50k emails)

Even at full paid tier, **a 100-client agency** would pay **<$30/month** in infrastructure.

---

## 9. Security & data handling

- **No client data is persisted server-side beyond a session.** The in-memory `REPORTS` list is wiped on every backend restart. Generated PDFs are written to `backend/generated_reports/` but can be cleaned up by Render's ephemeral filesystem.
- **No PII goes to the LLM provider.** All client data sent to Groq is metrics, not personal data. Email addresses live only inside the email-send step and never enter LLM context.
- **CORS** is locked to a single `FRONTEND_ORIGIN` env var in production.
- **API keys** are environment variables, never committed. `.env.example` documents the shape; `.env` is `.gitignore`d.
- **Resend testing mode** is the only delivery path that affects external mailboxes — and it can only send to the account owner's verified email, so misconfigurations don't leak to third parties.

---

## 10. Future roadmap

### Tier 1 — direct uploads & integrations (the obvious next step)

These items remove the need to hardcode sample clients and turn PROITBRIDGE into a tool a real agency could plug into tomorrow.

**A. CSV upload for ad-hoc client data**
   - Drag-and-drop a CSV onto the dashboard.
   - Schema: `channel,impressions,clicks,conversions,spend,revenue` (one row per channel).
   - Parsed server-side, validated against schema, written to a new "Custom Client" record.
   - Same generate-report pipeline runs against it unchanged.
   - **Why it matters:** removes the hardcoded sample data barrier.

**B. Meta Marketing API integration**
   - OAuth into the client's Meta Business account.
   - Pull Facebook Ads + Instagram Ads spend/revenue/conversion data for a configurable period.
   - Maps to the existing channel structure — no other code changes needed.
   - **Why it matters:** Meta is the most-used ad platform after Google. Auto-pull is a 10× UX upgrade over CSV.

**C. Google Ads API integration**
   - Similar OAuth flow → pull `ads.googleapis.com` metrics.
   - Optional: Google Analytics 4 (GA4) for organic / referral revenue attribution.
   - **Why it matters:** completes the "set it and forget it" promise.

**D. LinkedIn Ads integration**
   - For B2B-focused agencies (LinkedIn is the primary channel for fintech, SaaS, etc.).

**E. Email platform integrations**
   - Mailchimp, Klaviyo, HubSpot — pull email campaign performance per period.

### Tier 2 — multi-tenant SaaS

**F. Authentication + workspaces**
   - One agency account = one workspace.
   - Multiple users per workspace (account manager, ops lead, owner).
   - Role-based access (account managers see only their clients).
   - **Approach:** Clerk or Supabase Auth, JWT-validated FastAPI dependency.

**G. Postgres persistence**
   - Replace in-memory `REPORTS` list with a real database.
   - Reports survive restarts; full historical archive per client.
   - **Approach:** Render Postgres or Supabase; SQLAlchemy + Alembic migrations.

**H. Scheduled / recurring reports**
   - "Generate this report on the 1st of every month at 9am."
   - Background worker (Render's free tier supports cron services).
   - Auto-email; manager only gets a notification when a report is ready.

### Tier 3 — intelligence layer

**I. Industry benchmarks**
   - Hardcoded then ML-derived benchmark ROI per industry × channel.
   - "Your client's email ROI is 73x — industry median is 14x. They're 5× the benchmark."

**J. What-if scenario modelling**
   - Interactive sliders on the client detail page.
   - "Move $1,000 from Facebook to email" → recompute projected revenue using each channel's current ROI as the elasticity.
   - Surface projections in a side-by-side panel.

**K. Anomaly alerts**
   - Detect mid-month performance cliffs (channel conversion drops by 30% week-over-week).
   - Push notification or Slack DM to the account manager.

**L. Auto-recommendations from learned patterns**
   - Learn from past reports across the client base ("Clients who reallocated 20% from social to email saw +18% blended ROI").
   - Surface these as additional bullets in Recommended Actions.

### Tier 4 — productisation

**M. White-label branding per agency**
   - Upload logo, set primary color, custom email-from domain.
   - Reports go out as **the agency's** brand, not PROITBRIDGE's.

**N. Client portal**
   - Each client gets a magic-link login to see their historical reports.
   - Removes the "did we send the May report?" support questions.

**O. Slack / Microsoft Teams integration**
   - `/generate-report novaspark` slash command.
   - Report PDF posted into a channel when complete.

**P. PROITBRIDGE API for partners**
   - Let other agency tools (project management, time-tracking) trigger report generation via webhook.

---

## 11. Deploy targets & timeline (current state)

The application is **deploy-ready today**. Two clicks per service:

| Component | Service | URL pattern                                     |
| --------- | ------- | ----------------------------------------------- |
| Frontend  | Vercel  | `https://<project-name>.vercel.app`             |
| Backend   | Render  | `https://<service-name>.onrender.com`           |

See [DEPLOY.md](DEPLOY.md) for the step-by-step click-through.

---

## 12. Conclusion

PROITBRIDGE turns a 2–4 hour task into a 30-second one, without sacrificing report quality or numerical accuracy. It's built on free-tier infrastructure that scales to ~500 reports/month and ~$30/mo to ~10,000 reports/month.

The five-agent architecture and provider-agnostic LLM wrapper mean future improvements (better models, more channels, deeper insights) plug in without rewrites. The roadmap above is the obvious path from "demo with hardcoded sample data" to "SaaS product an agency would pay for."

**Today's state:** working end-to-end demo with branding, charts, chat, deterministic math, and live agent streaming.
**Tomorrow's state, with 1–2 weeks of work:** CSV upload, Meta + Google Ads API integrations, Postgres persistence, scheduled reports — a tool a small agency could use in production.

---

*PROITBRIDGE — Strive For Better Future.*
