# Deploying MediCite

Two pieces go to two hosts:

- **Backend (FastAPI + ML models)** → **Render** (free web service, native Python,
  no card, no Docker needed).
- **Frontend (Next.js)** → **Vercel**. Free, and it's what you already use.

Total cost: **₹0**. Generation runs on your free Groq key.

> **Why not Hugging Face Spaces?** As of mid-2026 HF made Docker and Gradio Spaces
> PRO-only ($9/mo) — only Static Spaces are free, which can't run FastAPI. Render's
> free tier still runs a Python web service for free.

---

## 1. Backend → Render

Render's free instance has **512 MB RAM**. Running both the embedding *and* reranker
models can exceed that, so the deployed backend uses **vector-only retrieval**
(`RERANK_ENABLED=false`, already set in `render.yaml`). Retrieval still works; it
just skips the cross-encoder rerank stage. Locally you keep the full two-stage
pipeline — so your demo video / screenshots show reranking, and the live link is a
lighter version. (To run the full pipeline live, use a host with ≥1 GB RAM — see
"Production upgrades".)

1. Make a free account at https://render.com (sign in with GitHub — no card).
2. **New → Blueprint**. Connect your GitHub and pick the **`medicite`** repo. Render
   reads `render.yaml` and proposes the `medicite-api` service. Click **Apply**.
3. It will ask for the two secret env vars (`sync: false` in the blueprint):

   | Name | Value |
   |---|---|
   | `GROQ_API_KEY` | your `gsk_...` key |
   | `ALLOWED_ORIGINS` | `https://<your-vercel-app>.vercel.app` — fill in after step 2 below; use `*` for now |

4. First build installs dependencies and, on the first request, downloads the
   embedding model (~90 MB) — so the very first question after a cold start takes a
   few extra seconds. Your API base URL is:

   ```
   https://medicite-api.onrender.com
   ```

   Check it: open `https://medicite-api.onrender.com/api/health` — you should see the
   JSON health response with `"llm_provider":"groq"`.

> **Two free-tier notes:** (1) the instance **spins down after ~15 min idle**, so the
> first request after a gap takes ~50 s to wake — normal for free Render. (2) The disk
> is ephemeral: uploaded documents reset on restart. Fine for a demo (upload, then ask
> in the same session). For durable storage, see "Production upgrades" below.

> **Prefer Docker?** A `backend/Dockerfile` is included and works on **Google Cloud
> Run** (free tier, ≥1 GB RAM, keeps the full reranker pipeline — needs a Google
> account with a card on file, but stays within the free allowance) or **Fly.io**.

---

## 2. Frontend → Vercel

1. Push the whole repo to GitHub (already done for `medicite`).
2. At https://vercel.com → **Add New → Project** → import the `medicite` repo.
3. **Root Directory:** set to `frontend`.
4. **Environment Variables** — add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE` | `https://<your-username>-medicite-api.hf.space` |

5. **Deploy.** Vercel gives you `https://<your-app>.vercel.app`.
6. Go back to the Hugging Face Space secrets and set `ALLOWED_ORIGINS` to that exact
   Vercel URL (no trailing slash), then restart the Space so CORS allows it.

Open the Vercel URL, upload a document, ask a question. Done — live. 🎉

---

## Production upgrades (optional, for the CV story)

These turn the demo into the "production-grade" version the README describes:

- **Persistent vector store — pgvector.** Create a free Postgres with pgvector at
  [Neon](https://neon.tech) or [Supabase](https://supabase.com). On the Space, set
  `VECTOR_STORE=pgvector` and `DATABASE_URL=<their connection string>`. Documents
  and embeddings now survive restarts. This is the "pgvector on managed Postgres"
  line in the README and CV pitch.
- **Persistent raw files — S3.** Set `STORAGE_BACKEND=s3`, `S3_BUCKET=<bucket>`, and
  give the Space AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as
  secrets). Uploaded PDFs then persist for the viewer.

With both, nothing is ephemeral and the deploy is genuinely production-shaped.

---

## Environment variables reference

| Variable | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | backend | Groq generation key |
| `LLM_PROVIDER` | backend | `groq` or `gemini` |
| `GROQ_MODEL` | backend | default `llama-3.3-70b-versatile` |
| `RERANK_ENABLED` | backend | `false` on Render free (512 MB); `true` locally / on ≥1 GB hosts |
| `ALLOWED_ORIGINS` | backend | comma-separated frontend URLs for CORS |
| `VECTOR_STORE` | backend | `local` or `pgvector` |
| `DATABASE_URL` | backend | Postgres DSN (pgvector mode) |
| `STORAGE_BACKEND` | backend | `local` or `s3` |
| `NEXT_PUBLIC_API_BASE` | frontend | the backend's public URL |
