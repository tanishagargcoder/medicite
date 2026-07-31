# MediCite

Ask questions about medical records in plain English and get answers grounded in the
source documents, with clickable citations back to the exact page.

A generic chatbot asked "what was she discharged on?" will produce a fluent, plausible,
sometimes wrong medication list. MediCite retrieves the actual passages first, answers
only from them, and attaches a citation to every clinical claim — so the answer is
verifiable in one click instead of taken on trust. When the documents don't contain the
answer, it says so rather than filling the gap.

## How it works

Two pipelines share one vector store.

**Ingestion** (once per document)

```
upload → extract text + page numbers → recursive chunking → embed → vector store
```

**Query** (once per question)

```
question → embed → cosine search (top 20) → cross-encoder rerank (top 5) → cited answer
```

### Two-stage retrieval

Stage 1 uses a bi-encoder, which scores the question and each passage independently.
That is fast enough to sweep the whole corpus, but it rewards topical overlap rather
than actually answering the question — a passage that merely mentions the right drug
scores as well as the one stating its dose.

Stage 2 re-scores those 20 candidates with a cross-encoder that reads the question and
passage *together*, and keeps the best 5. Twenty cross-encoder passes are cheap, and the
narrowing pays off twice: better passages reach the model, and fewer of them, so there's
less loosely-related context for the answer to drift into.

`scripts/evaluate.py` measures exactly this — see [Evaluation](#evaluation).

### Citation grounding

The model receives numbered excerpts and may only cite those numbers. Markers are parsed
out of the response and validated against what was actually retrieved, so a fabricated
citation is stripped rather than rendered as a dead link. Each surviving marker maps to a
document and page, which is what makes the citation clickable — and clicking it scrolls
the PDF viewer to that page and highlights the cited lines.

Abstention is a first-class outcome, not a fallback. In a clinical context a confident
wrong answer is worse than no answer, so the prompt makes "the documents don't say this"
the correct move, and the UI labels those turns explicitly.

### Hybrid answering

Not every message is a document question. A greeting, a general medical concept, or
something the records simply don't cover shouldn't produce a forced answer over
irrelevant chunks.

So the grounded attempt runs first; if it abstains, the question falls through to a
general assistant that answers from its own knowledge and is **labelled as such in the
UI**. The one thing it will not do is invent patient-specific facts: asked for a value
that isn't in the uploaded records, it says the documents don't contain it and suggests
what to upload.

## Features

- **Grounded Q&A with page-level citations** — click a citation to jump to the source page
  with the cited text highlighted
- **Streaming answers** — tokens arrive as they're generated; the grounded attempt is
  buffered just long enough to detect an abstention, so a wrong-mode answer is never shown
  half-written
- **Accounts and per-user isolation** — JWT auth; each user only ever searches their own
  documents
- **Export** — copy an answer as Markdown, download it, or produce a branded PDF report
  with its sources
- **Scoped search** — restrict a question to selected documents
- **Light / dark themes** and five accent colours, in Settings

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, react-pdf, Tailwind, three.js (landing hero) |
| Backend | FastAPI |
| Embeddings | fastembed / BAAI bge-small-en-v1.5 (local, 384-dim) |
| Reranker | ms-marco-MiniLM-L-6-v2 cross-encoder (local) |
| Vector store | pgvector on Postgres — or numpy locally |
| Generation | Groq / Llama 3.3 70B (free tier) — or Google Gemini |
| Auth | JWT + PBKDF2-HMAC-SHA256 |
| File storage | Local disk or S3 |

Embeddings and reranking run locally, so ingestion needs no API key and costs nothing per
document. Only answer generation calls out to an API, and a free Groq key covers it.

## Running it

Requires Python 3.11+, Node 20+, and a free [Groq](https://console.groq.com) API key.

**Backend**

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                 # add GROQ_API_KEY
python scripts/make_sample.py                        # optional synthetic record to test with
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 for the landing page, or go straight to `/app`. Create an
account, upload a document, and ask something. The first ingestion downloads the embedding
model (~90 MB) and takes a few extra seconds.

### Switching to Postgres

The default local stores keep setup to zero, but they write to the app's own disk — which
is **ephemeral on free hosting**, so accounts and documents are lost on restart. For a real
deployment:

```bash
docker compose up -d
# in backend/.env:
#   USER_STORE=postgres        accounts persist
#   VECTOR_STORE=pgvector      documents and embeddings persist
#   DATABASE_URL=postgresql://…
```

Schema and the IVFFlat cosine index are created on startup. Point `DATABASE_URL` at a
managed Postgres (Neon, Supabase, RDS) and nothing else changes.

Deployment steps for Render + Vercel are in [DEPLOY.md](DEPLOY.md).

## Evaluation

"Is the retrieval any good?" should have a number behind it, so
`backend/scripts/evaluate.py` scores the pipeline against a labelled question set
(`backend/eval/questions.json`) and reports:

- **Recall@k** — how often the passage that actually answers the question is retrieved
- **MRR** — how highly it ranks
- **Abstention accuracy** — does it correctly decline when the answer isn't in the corpus

It runs the same query path twice, with and without the reranker, so the effect of stage 2
is measured rather than asserted.

```bash
cd backend
python scripts/evaluate.py            # retrieval metrics only, no API key needed
python scripts/evaluate.py --answers  # also grade grounding and abstention (uses the LLM)
```

Current results on the sample corpus (19 questions — 15 answerable, 4 deliberately not):

| Stage | Recall@1 | Recall@3 | Recall@5 | MRR |
|---|---|---|---|---|
| Vector search only | 53.3% | 86.7% | 100% | 0.719 |
| **+ cross-encoder rerank** | **73.3%** | 86.7% | 100% | **0.822** |

Stage 2 moves the right passage into first place 20 points more often (**+0.103 MRR**) —
the whole point of the second stage, measured rather than assumed.

On answer quality: **100%** of answered questions carried a citation, and **4/4**
unanswerable questions were correctly declined with zero false abstentions — the
safety behaviour the design depends on, checked rather than hoped for.

> The corpus is one synthetic discharge summary, so these numbers describe the pipeline's
> behaviour, not a general benchmark. The harness is built to point at a larger labelled
> set unchanged.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in; returns a JWT |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/documents` | Upload and ingest a PDF or DOCX |
| `GET` | `/api/documents` | List the caller's documents |
| `GET` | `/api/documents/{id}/file` | Original bytes, for the viewer |
| `DELETE` | `/api/documents/{id}` | Remove a document and its chunks |
| `POST` | `/api/ask` | Ask a question; returns answer + citations |
| `POST` | `/api/ask/stream` | Same, streamed as Server-Sent Events |
| `GET` | `/api/health` | Active backends and models |

Every endpoint except `/api/auth/*` and `/api/health` requires `Authorization: Bearer <jwt>`.

## Design notes

**Chunks never straddle a page or a section.** A chunk maps to exactly one page, so every
citation resolves to a single place in the viewer. Splitting is recursive — paragraph, then
sentence, then a hard cut only for things like long lab tables — with ~100 tokens of overlap
carried forward so a fact split across a boundary stays retrievable from both sides.

**Section titles are extracted, not guessed.** Clinical documents are highly structured
(`HISTORY OF PRESENT ILLNESS`, `DISCHARGE MEDICATIONS`, `ASSESSMENT AND PLAN`), and those
headers are detected during extraction and stored on each chunk. They're shown on the
citation card and fed to the reranker, where the section a passage lives in is real signal
about whether it answers a clinical question.

**Document text is treated as data, not instructions.** Excerpts are wrapped in tags and the
system prompt states that anything resembling instructions inside a document should be
ignored and reported — an uploaded file is untrusted input.

**Degradation is graceful.** If the reranker can't load, retrieval falls back to vector
scores and the query still answers — which is what the 512 MB free deployment tier runs.
A scanned PDF with no text layer is rejected at upload with a clear message rather than
silently ingesting zero chunks.

**The generation provider is swappable.** `LLM_PROVIDER` selects Groq or Gemini; only one
function differs between them, and citation parsing, abstention, and streaming are
provider-agnostic.

## Limitations

- Scanned documents need OCR first; there's no OCR step in the pipeline.
- DOCX has no page concept, so pages are synthesized every ~3000 characters and the viewer
  can't render a preview — citations still name a page.
- Retrieval is dense-only. Hybrid search with BM25 would help on exact identifiers like
  MRNs and ICD codes.
- Questions are answered independently; there is no multi-turn follow-up context yet.
- Not a medical device. It summarizes uploaded documents and does not diagnose or
  recommend treatment; every answer should be checked against its citation.
