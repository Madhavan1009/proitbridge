# DeflectAI — Project Brief (handoff doc)

> Use this doc to start building **DeflectAI** in a new chat. It captures all the decisions made for the project, the brand system to carry forward from PROITBRIDGE, the scope, the sample data spec, and the tech stack. Paste this file's contents (or link to it) as the kickoff context in any new conversation.

---

## 1 · Why this exists

DeflectAI is the 4th project in a 5-project B2B AI automation series being produced as build-along tutorials for the **AI Coach John** YouTube channel (Tamil-language, audience = working professionals upskilling into AI / GenAI / Agentic AI roles).

Series so far:
1. RAG system
2. n8n workflow automation
3. **PROITBRIDGE** — client report automation (chained LLM pipeline, repo: https://github.com/Madhavan1009/proitbridge)
4. **DeflectAI** — this project (real multi-agent system with LangGraph)
5. *(TBD — capstone)*

**Pedagogical contrast we're teaching:** PROITBRIDGE = fixed pipeline of LLM calls. DeflectAI = real agent graph with conditional routing. Same goal (production AI), different shape.

---

## 2 · What DeflectAI is

**One-liner:** *AI customer support triage that auto-resolves the 60-80% of routine tickets, routes the rest to the right human with full context, and never hallucinates.*

**B2B target:** SaaS / B2B services companies, 50-500 employees, support teams processing 200-2000 tickets/day.

**Not for:** physical / hardware / field service support, regulated medical/legal advice.

**The dollar story** (for a 5-person support team handling 500 tickets/day):
- 60% auto-resolved → 300 tickets/day handled with zero human time
- Of remaining 40%, agent prep cuts human handle time from 8 min → 3 min
- **~30 hours/day of human time saved**, ≈ 4 FTEs ≈ $200-300k/year saved
- DeflectAI infra cost at this volume: ~$50/month on Groq paid tier
- **ROI ~5000x**

---

## 3 · Tech stack (mirrors PROITBRIDGE, reuse what we can)

| Layer | Choice | Notes |
|-------|--------|-------|
| Agent framework | **LangGraph** | NOT CrewAI — escalation routing is graph-shaped, needs conditional branching |
| LLM | **Groq · Llama 3.3 70B** (same Groq key as PROITBRIDGE) | Free tier, sub-second latency |
| Backend | Python 3.11 + FastAPI | Same as PROITBRIDGE; reuse SSE patterns |
| Vector DB | **ChromaDB** (persistent on disk) | Free, in-process, no infra |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Local, CPU, free |
| Structured outputs | Pydantic | Catch LLM JSON drift |
| Frontend | React + Vite + Tailwind | Same as PROITBRIDGE |
| Notifications | **Slack webhook** + Resend email | Both free; reuse Resend key from PROITBRIDGE |
| Persistence | **SQLite** | Tickets, escalations, agent traces, eval results |
| Deploy | Render (backend) + Vercel (frontend) | Same accounts as PROITBRIDGE, free tier |

**Reuse from PROITBRIDGE repo:**
- `agents/llm_client.py` — Groq wrapper (works as-is)
- `services/email_sender.py` — Resend integration
- `services/pdf_generator.py` — only if v2 adds PDF reports
- Tailwind config, `Logo.jsx`, `Sidebar.jsx`, `AnimatedCounter.jsx` — same brand system
- `vercel.json`, `render.yaml`, `.gitignore`, `DEPLOY.md` — copy and adjust names

---

## 4 · Brand system (identical to PROITBRIDGE — DeflectAI as sub-product)

DeflectAI is a **product** under the PROITBRIDGE parent brand. Visually identical design system, but with its own product name in headers/title.

### Logo
Reuse the existing `Logo.jsx` component verbatim — globe + PROITBRIDGE wordmark. Add a small sub-label "DeflectAI" as a secondary line on the dashboard top bar.

### Color palette (Tailwind config — same as PROITBRIDGE)
```js
sidebar: '#071633',          // Navy 950
navy: { 950: '#071633', 900: '#0b1d3f', 800: '#0f2552' },
brand: {
  DEFAULT: '#046bd2',         // Blue 600 ★
  dark:    '#045cb4',         // Blue 700
  light:   '#22d3ee',         // Cyan 500 ★
  lighter: '#d9f8fd',         // Cyan 100
},
cyan: { 500: '#22d3ee', 100: '#d9f8fd' },
```

### Gradients (already in `index.css`)
```css
.bg-navy-gradient { background: linear-gradient(135deg,#071633 0%,#0b1d3f 50%,#045cb4 100%); }
.bg-brand-gradient { background: linear-gradient(135deg,#046bd2 0%,#22d3ee 100%); }
```

### Typography
- Font: **Inter** (loaded from Google Fonts in `index.html`)
- Sidebar dark `#071633`, content area light `#f8fafc` / white, cyan accents
- Animated cyan pulse on active states (already defined as `animate-soft-pulse`)

### Tagline
"Strive For Better Future"

### Sub-product naming convention in UI
Top-left logo: PROITBRIDGE (full)
Below tagline or breadcrumb: "DeflectAI · Customer Support Automation"

---

## 5 · v1 scope — the agreed superset

### MUST-HAVE (7 from ChatGPT's list)

1. **Ticket Input** — Gmail poller + form submission. Zendesk webhook as adapter pattern (implement interface, mock for v1, real connector in v2).
2. **Classifier Agent** — intent, urgency, sentiment, **+ topic, customer_tier, churn_signals**.
3. **RAG KB Search** — ChromaDB semantic search, top-K retrieval with confidence scores.
4. **Response Draft Agent** — grounded response with inline citations to KB articles.
5. **Escalation Decision** — multi-signal logic, NOT just confidence threshold (see decision tree below).
6. **Slack Alert / Human Queue** — webhook to a configurable channel + an in-app queue page for humans.
7. **Dashboard** — counts (incoming / resolved / escalated / spam), avg confidence, top escalation reasons, KB gaps.

### Additions for production-MVP feel (the "superset")

8. **Quality Auditor agent** — checks every factual claim in the drafted reply against retrieved KB chunks. Blocks send if mismatch found. This is the **trust layer** — non-negotiable.
9. **KB ingestion pipeline** — upload markdown / PDF / text files, chunk, embed, store in Chroma. Without this, no real customer can onboard.
10. **Agent trace viewer** — per-ticket page showing each agent's input/output/reasoning. Lets operators understand *why* the system made a decision. Critical for B2B trust.

### Defer to v2 / "advanced episode"

- **Tone Adjuster agent** (nice-to-have; UX polish)
- **Eval panel** (golden tickets + regression detection) — this is the *capstone teaching topic* for the final episode; build it last
- **Real Zendesk connector** (use mock webhook for v1 demo)

---

## 6 · Escalation Detective — the decision tree

This replaces ChatGPT's simple `if kb_confidence < 0.5: escalate` because real B2B scenarios need multi-signal reasoning.

```python
def decide(classifier_output, kb_confidence, customer):
    if classifier_output.intent == "spam":
        return "ARCHIVE_SILENT"

    if classifier_output.contains_signals(["data_loss", "security_breach", "outage"]):
        return "ESCALATE_P0"   # page on-call engineering immediately

    if (classifier_output.sentiment == "very_negative"
            and customer.tier in ("Pro", "Enterprise")):
        return "ESCALATE_RETENTION"   # notify CSM, draft holding reply

    if classifier_output.contains_signals(["cancel", "refund_above_threshold"]):
        return "ESCALATE_RETENTION"

    if kb_confidence < 0.5:
        return "ESCALATE_LOW_CONFIDENCE"   # legitimate question, no KB answer → route to expert

    return "AUTO_REPLY"   # green path: KB-grounded auto-resolution
```

For the **early tutorial episodes**, start with the simple threshold version. Upgrade to this multi-signal version in episode 4 as the *"make it production-grade"* lesson. Perfect pedagogical arc.

---

## 7 · Sample data — AcmeCRM mock company

Mock SaaS company: **AcmeCRM** (B2B CRM platform).

### KB articles (50 total — categories below, 10 each)
1. **Pricing & Plans** — Free / Pro $49/mo / Enterprise custom
2. **Integrations** — Salesforce, HubSpot, Slack, Zapier, API
3. **Account & Billing** — refunds, plan changes, invoices, tax
4. **Troubleshooting** — login issues, sync errors, performance, exports
5. **Security & Compliance** — 2FA, SSO, data retention, GDPR

### Sample tickets (25 total — covering every pattern)
- 10 simple how-to / billing (auto-deflect path)
- 5 angry / churn-risk Pro customers (escalate retention)
- 3 P0 emergencies (data loss / security)
- 3 off-topic / wrong-company (polite redirect)
- 2 spam / promotional (silent archive)
- 2 legitimate questions outside KB (escalate low-confidence + log gap)

### Customer profiles (used by Classifier for tier-aware decisions)
- Mike @ Acme Studio · Free · 3 days tenure
- Sarah @ Lightspeed Labs · Pro · 8 months · MRR $49
- Priya @ Bluewave · Pro · 18 months · MRR $49 · high CSAT
- Raj @ Globex Inc · Enterprise · 3 years · MRR $2,400

---

## 8 · Workflow (the 6-agent graph)

```
ticket in → Classifier → KB Searcher → Solution Drafter → Escalation Detective
                                                              │
                              ┌──────────────────────┬────────┴─────────┬──────────────┐
                              ▼                      ▼                  ▼              ▼
                       AUTO_REPLY           ESCALATE_LOW_CONF    ESCALATE_P0    ARCHIVE_SILENT
                              │                      │                  │              │
                       Quality Auditor        holding reply +     holding reply +    no reply
                              │                slack #support     slack #eng-p0
                              ▼                + queue page       + page on-call
                       ✉ send reply                              + CSM ping
```

### Three ticket walkthroughs (for the demo)

**Ticket A — "How do I upgrade to Pro?"** → Classifier (low urgency, neutral) → KB match 0.94 → Drafter cites KB → Detective: AUTO_REPLY → Auditor approves → ✉ sent in 4 sec.

**Ticket B — "MY DATA IS GONE!! Cancelling!!"** → Classifier (critical, very_negative, churn) → KB match 0.38 → Drafter writes holding reply → Detective: ESCALATE_P0 + ESCALATE_RETENTION → Slack alert to `#eng-p0` + DM CSM → ✉ holding reply sent in 6 sec.

**Ticket C — "Can you sync with QuickBooks?"** → Classifier (medium, neutral, integration_inquiry) → KB match 0.31 → Drafter refuses to hallucinate → Detective: ESCALATE_LOW_CONFIDENCE → Routes to product team → Logs "QuickBooks integration" to KB gap queue → ✉ acknowledgement sent.

These three tickets are the **on-camera demo** for the YouTube series — auto-deflect (easy), escalate (dramatic), refuse-to-hallucinate (the trust-building moment).

---

## 9 · 5-episode teaching outline (for the channel)

| Ep | Topic | Deliverable by end of episode |
|----|-------|--------------------------------|
| 1 | Project intro, LangGraph fundamentals, "agents vs pipelines" framing | Skeleton repo, hello-world graph runs |
| 2 | KB ingestion + RAG layer (Chroma, embeddings, retrieval) | Can query the KB, get top-K with scores |
| 3 | Classifier + Solution Drafter agents | First end-to-end auto-reply on Ticket A |
| 4 | Escalation Detective (multi-signal) + Quality Auditor + Slack integration | Tickets B and C work — full agent graph |
| 5 | Frontend dashboard + deploy to Vercel + Render | Live MVP at e.g. deflectai.vercel.app |

*(Bonus episode 6: Eval panel + observability — capstone advanced lesson.)*

---

## 10 · Deploy plan

Mirror PROITBRIDGE:

- **Frontend** → Vercel, root dir `frontend`, env var `VITE_API_BASE`
- **Backend** → Render web service, root dir `backend`, env vars: `GROQ_API_KEY`, `GROQ_MODEL`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY` (fallback), `FRONTEND_ORIGIN`, `PYTHON_VERSION=3.11.9`
- **Repo** → new GitHub repo `deflectai` under `Madhavan1009` (don't co-mingle with PROITBRIDGE)
- **Domains** → `deflectai.vercel.app` + `deflectai-api.onrender.com`

---

## 11 · What to bring to the new chat

If you start the new chat with: *"continue building DeflectAI per `DEFLECTAI_BRIEF.md` in https://github.com/Madhavan1009/proitbridge — let's start with Episode 1: skeleton repo + LangGraph hello-world graph"* — that's a complete kickoff. The new chat can read this file from the repo and have all the context.

### Files to copy from PROITBRIDGE for fast bootstrap
- `backend/agents/llm_client.py` (Groq wrapper)
- `backend/services/email_sender.py` (Resend integration)
- `frontend/src/components/Logo.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/AnimatedCounter.jsx`
- `frontend/tailwind.config.js`
- `frontend/src/index.css` (gradient utilities)
- `frontend/vercel.json`
- `render.yaml`
- `.gitignore`

### Existing accounts (keys live in PROITBRIDGE's local `.env`, NOT in the repo)
- **GitHub:** Madhavan1009
- **Groq:** key already provisioned (in PROITBRIDGE `.env`)
- **Resend:** key already provisioned, account `proitbridge.manager@gmail.com`, FROM `onboarding@resend.dev`
- **Vercel + Render:** logged in via GitHub OAuth

### One new key needed for DeflectAI
- **Slack incoming webhook URL** — create a workspace or use an existing one → Apps → Incoming Webhooks → grab the URL. Free.

---

## 12 · Open questions to resolve in the new chat

1. **Repo strategy** — new `deflectai` repo, or a monorepo with both projects? Recommend: new repo (cleaner deploy, different product).
2. **Sample data origin** — generate the 50 KB articles + 25 tickets with an LLM (one-time) or hand-write? Recommend: LLM-generate then curate.
3. **Live email ingestion** — Gmail IMAP polling or just a "paste a ticket" UI for demo? Recommend: both — paste UI for demo, Gmail poller as a separate documented integration.
4. **Frontend chat UI for testing** — separate from operator dashboard? Recommend: yes, two distinct surfaces (operator dashboard + customer-side "submit ticket" demo page).

---

*Document maintained as part of the PROITBRIDGE repo. Last update: project handoff for DeflectAI development.*
