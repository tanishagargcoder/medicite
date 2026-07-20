# Deploying MediCite

Two pieces go to two hosts:

- **Backend (FastAPI + ML models)** → **Hugging Face Spaces** (Docker). Free, 16 GB
  RAM, built for ML — the embedding + reranker models load comfortably. (Render's
  free tier has only 512 MB and will likely OOM with both models.)
- **Frontend (Next.js)** → **Vercel**. Free, and it's what you already use.

Total cost: **₹0**. Generation runs on your free Groq key.

---

## 1. Backend → Hugging Face Spaces

1. Make a free account at https://huggingface.co
2. **New → Space**. Name it `medicite-api`. Choose **Docker** → **Blank**. Keep it
   public (private Spaces sleep aggressively on free tier).
3. The Space is a git repo. Push **only the `backend/` folder's contents** to it:

   ```bash
   cd backend
   git init
   git remote add space https://huggingface.co/spaces/<your-username>/medicite-api
   git add .
   git commit -m "MediCite backend"
   git push space main
   ```

   (Or upload the files through the Space's web UI — drag `Dockerfile`,
   `requirements.txt`, and the `app/` and `scripts/` folders.)

4. Add the Space to use the Docker port. In the Space **Settings → Variables and
   secrets**, add these **Secrets**:

   | Name | Value |
   |---|---|
   | `GROQ_API_KEY` | your `gsk_...` key |
   | `LLM_PROVIDER` | `groq` |
   | `ALLOWED_ORIGINS` | `https://<your-vercel-app>.vercel.app` (fill in after step 2 below; comma-separate to allow more) |

5. In the Space **Settings**, set **App port** to `7860` (the Dockerfile exposes it).
6. The Space builds and starts. First boot downloads the embedding model (~90 MB),
   so give it a minute. Your API base URL is:

   ```
   https://<your-username>-medicite-api.hf.space
   ```

   Check it: open `https://<...>.hf.space/api/health` — you should see the JSON
   health response with `"llm_provider":"groq"`.

> **Note on persistence:** the free Space's disk is ephemeral — uploaded documents
> reset when the Space restarts. That's fine for a demo (upload, then ask in the
> same session). For durable storage, see "Production upgrades" below.

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
| `ALLOWED_ORIGINS` | backend | comma-separated frontend URLs for CORS |
| `VECTOR_STORE` | backend | `local` or `pgvector` |
| `DATABASE_URL` | backend | Postgres DSN (pgvector mode) |
| `STORAGE_BACKEND` | backend | `local` or `s3` |
| `NEXT_PUBLIC_API_BASE` | frontend | the backend's public URL |
