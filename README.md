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

### Citation grounding

The model receives numbered excerpts and may only cite those numbers. Markers are parsed
out of the response and validated against what was actually retrieved, so a fabricated
citation is stripped rather than rendered as a dead link. Each surviving marker maps to a
document and page, which is what makes the citation clickable.

Abstention is a first-class outcome, not a fallback. In a clinical context a confident
wrong answer is worse than no answer, so the prompt makes "the documents don't say this"
the correct move, and the UI labels those turns explicitly.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, react-pdf, Tailwind |
| Backend | FastAPI |
| Embeddings | fastembed / BAAI bge-small-en-v1.5 (local, 384-dim) |
| Reranker | ms-marco-MiniLM-L-6-v2 cross-encoder |
| Vector store | pgvector on Postgres — or numpy locally |
| Generation | Google Gemini 2.0 Flash (free tier) |
| File storage | Local disk or S3 |

Embeddings and reranking run locally, so ingestion needs no API key and costs nothing per
document. Only answer generation calls out to an API — a free Gemini key covers it.

## Running it

Requires Python 3.11+, Node 20+, and an Anthropic API key.

**Backend**

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                                 # add your GOOGLE_API_KEY (free)
python scripts/make_sample.py                        # optional synthetic record to test with
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, upload a document, and ask something. The first ingestion
downloads the embedding model (~90MB) and takes a few extra seconds.

### Switching to pgvector

The default local store keeps setup to zero. For the production path:

```bash
docker compose up -d
# in backend/.env:  VECTOR_STORE=pgvector
```

Schema and the IVFFlat cosine index are created on startup. Point `DATABASE_URL` at RDS
and nothing else changes.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/documents` | Upload and ingest a PDF or DOCX |
| `GET` | `/api/documents` | List ingested documents |
| `GET` | `/api/documents/{id}/file` | Original bytes, for the viewer |
| `DELETE` | `/api/documents/{id}` | Remove a document and its chunks |
| `POST` | `/api/ask` | Ask a question; returns answer + citations |
| `GET` | `/api/health` | Active backends and models |

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
scores and the query still answers. A scanned PDF with no text layer is rejected at upload
with a clear message rather than silently ingesting zero chunks.

## Limitations

- Scanned documents need OCR first; there's no OCR step in the pipeline.
- DOCX has no page concept, so pages are synthesized every ~3000 characters and the viewer
  can't render a preview — citations still name a page.
- Retrieval is dense-only. Hybrid search with BM25 would help on exact identifiers like
  MRNs and ICD codes.
- Not a medical device. It summarizes uploaded documents and does not diagnose or
  recommend treatment; every answer should be checked against its citation.
