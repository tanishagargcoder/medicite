# MediCite API

FastAPI backend for MediCite — RAG-powered clinical document Q&A with page-level
citations. The Next.js frontend lives in `../frontend` and points at this service's
URL via `NEXT_PUBLIC_API_BASE`.

## Run locally

```bash
python -m venv .venv && .venv/Scripts/activate    # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                               # set GROQ_API_KEY (free from console.groq.com)
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/api/health to confirm it's up.

## Deploy

See the repo's top-level `DEPLOY.md`. The recommended free host is **Render**
(native Python, no card) via the `render.yaml` blueprint. A `Dockerfile` is also
included for Google Cloud Run / Fly.io, which have enough RAM to keep the full
two-stage retrieval (reranker) enabled.

## Key environment variables

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq generation key (free) |
| `LLM_PROVIDER` | `groq` (default) or `gemini` |
| `RERANK_ENABLED` | `true` locally; `false` on 512 MB free hosts |
| `ALLOWED_ORIGINS` | comma-separated frontend URLs for CORS |
| `VECTOR_STORE` | `local` (default) or `pgvector` |
