from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..generation import generate_answer, to_citations
from ..retrieval import retrieve
from ..schemas import AskRequest, AskResponse

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest) -> AskResponse:
    """Query pipeline: embed -> search -> rerank -> generate cited answer."""
    question = request.question.strip()
    if not question:
        raise HTTPException(400, "Question cannot be empty.")
    if len(question) > 2000:
        raise HTTPException(400, "Question is too long (2000 character limit).")

    chunks, rerank_scores = retrieve(question, request.document_ids, request.top_k)
    answer, markers, abstained, usage = generate_answer(question, chunks)
    citations = to_citations(chunks, rerank_scores)

    # Only return citations the answer actually used — the UI renders these as
    # clickable source cards, and unused excerpts are noise.
    if markers:
        cited = {m for m in markers}
        citations = [c for c in citations if c.marker in cited]

    return AskResponse(
        answer=answer,
        citations=citations,
        cited_markers=markers,
        abstained=abstained,
        usage=usage,
    )
