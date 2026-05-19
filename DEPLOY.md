# Deploying PROITBRIDGE

Frontend goes to **Vercel**, backend goes to **Render**. The whole flow takes ~10 minutes once you have the GitHub repo.

> **Why not Vercel for both?** Vercel is serverless: function timeouts (60s on Pro, 10s on Hobby) will kill our SSE streams that run for 30–45 seconds, and the in-memory reports list won't survive between cold starts. Render runs a persistent process and is perfect for FastAPI + SSE.

---

## Step 0 — Push to GitHub

If you have the `gh` CLI installed and authenticated:

```powershell
gh repo create proitbridge --public --source=. --remote=origin --push
```

Otherwise, do it via the web UI:

1. Go to https://github.com/new → name it `proitbridge` (or anything) → **Create repository**.
2. Back in your local terminal:

   ```powershell
   git remote add origin https://github.com/<your-username>/proitbridge.git
   git branch -M main
   git push -u origin main
   ```

> Confirm `.env` is NOT committed: `git ls-files | findstr ".env"` should print only `.env.example` files.

---

## Step 1 — Deploy the backend on Render

1. Sign in at https://render.com (GitHub login works).
2. Top right → **New** → **Web Service**.
3. Connect the GitHub repo you just pushed.
4. Render will detect [`render.yaml`](render.yaml) in the repo root and pre-fill most fields:

   | Field         | Value                                              |
   | ------------- | -------------------------------------------------- |
   | Name          | `proitbridge-api` (pre-filled)                     |
   | Runtime       | Python (pre-filled)                                |
   | Build command | `pip install --upgrade pip && pip install -r requirements.txt` |
   | Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT`     |
   | Root dir      | `backend`                                          |
   | Plan          | **Free**                                           |

5. Click **Advanced** → add these **environment variables** (the ones marked `sync: false` in `render.yaml` need values you paste manually):

   | Key                | Value                                                                  |
   | ------------------ | ---------------------------------------------------------------------- |
   | `GROQ_API_KEY`     | your key from https://console.groq.com/keys                            |
   | `GROQ_MODEL`       | `llama-3.3-70b-versatile` *(already in render.yaml; verify present)*   |
   | `RESEND_API_KEY`   | your key from https://resend.com                                       |
   | `FROM_EMAIL`       | `onboarding@resend.dev` *(already in render.yaml; verify present)*      |
   | `FRONTEND_ORIGIN`  | leave empty for now — we'll fill this in Step 3 once Vercel is live    |

6. **Create Web Service**.
7. Wait ~5 minutes for the first build. When you see `Live` ✅, copy the URL — it'll look like `https://proitbridge-api.onrender.com`. **Save this URL.**
8. Sanity check: open `https://proitbridge-api.onrender.com/health` in a browser. You should see:

   ```json
   {"status":"ok","llm_provider":"groq","model":"llama-3.3-70b-versatile","reports_generated":0}
   ```

> **Free tier note:** Render's free instance sleeps after 15 minutes of no traffic. First request after sleep takes ~30 seconds to spin back up; everything after that is instant. Fine for a demo. Upgrade to Starter ($7/mo) to keep it warm.

---

## Step 2 — Deploy the frontend on Vercel

1. Sign in at https://vercel.com (GitHub login).
2. **Add New** → **Project** → **Import** the same `proitbridge` GitHub repo.
3. Vercel auto-detects Vite. Override these settings:

   | Field                | Value                            |
   | -------------------- | -------------------------------- |
   | **Framework Preset** | Vite                             |
   | **Root Directory**   | `frontend`                       |
   | **Build Command**    | `npm run build` (default)        |
   | **Output Directory** | `dist` (default)                 |
   | **Install Command**  | `npm install` (default)          |

4. Expand **Environment Variables**, add one:

   | Key              | Value                                                            |
   | ---------------- | ---------------------------------------------------------------- |
   | `VITE_API_BASE`  | the Render URL from Step 1 (e.g. `https://proitbridge-api.onrender.com`) — **no trailing slash** |

5. **Deploy**. ~2 minutes to first deploy.
6. Copy the Vercel URL — looks like `https://proitbridge.vercel.app`. **Save this URL.**

---

## Step 3 — Lock CORS to your Vercel URL

Backend is currently allowing all origins (`*`). Now that you have a real frontend URL, lock it down.

1. Back in Render → your `proitbridge-api` service → **Environment**.
2. Edit `FRONTEND_ORIGIN` and set it to your Vercel URL from Step 2 (no trailing slash).
   - Example: `https://proitbridge.vercel.app`
   - Multiple URLs (e.g. preview + production): comma-separated — `https://proitbridge.vercel.app,https://proitbridge-git-main-yourname.vercel.app`
3. Save. Render auto-redeploys (~1 min).

---

## Step 4 — End-to-end smoke test

1. Open your Vercel URL.
2. You should see the landing page.
3. Click **Open Dashboard →**.
4. Pick a client (e.g. NovaSpark Digital). Click **Generate Report**.
5. You should see:
   - Agent timeline filling in live ✅
   - Final report renders below ✅
   - Download PDF button works ✅
   - Email lands in `proitbridge.manager@gmail.com` (or whichever Resend-verified address you used) ✅
   - Chat panel appears below the report — try "What if we doubled email spend?" ✅

If anything fails, check:
- Render logs (Render dashboard → your service → **Logs** tab) for backend errors.
- Browser DevTools console (F12 → Console) for frontend errors.
- CORS errors usually mean `FRONTEND_ORIGIN` doesn't exactly match your Vercel URL (no trailing slash, https not http).

---

## Updating after first deploy

Both services have **auto-deploy** enabled. Push to `main` → both rebuild and deploy automatically.

```powershell
git add .
git commit -m "describe your change"
git push
```

Render redeploys backend, Vercel redeploys frontend, all without touching either dashboard.

---

## Custom domain (optional)

- **Vercel** → project → Settings → Domains → add yours, Vercel walks you through DNS records.
- **Render** → service → Settings → Custom Domains → same flow.
- Update `FRONTEND_ORIGIN` on Render and `VITE_API_BASE` on Vercel if you change domains.

---

## Cost reality check

- **Render free tier:** 750 hrs/month of one web service, sleeps after 15min idle. Enough for any demo / low-volume usage.
- **Vercel hobby:** unlimited static deploys, 100GB bandwidth/mo. Plenty.
- **Groq free:** ~30 RPM, ~14,400 RPD. A report uses ~5 LLM calls → comfortably under limit.
- **Resend free:** 100 emails/day, 3,000/month. Fine.

You can run this entire stack **at $0/month** for serious demo use.
