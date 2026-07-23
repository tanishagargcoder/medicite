from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..auth import current_user
from ..generation import general_answer, generate_answer, to_citations
from ..retrieval import retrieve
from ..schemas import AskRequest, AskResponse
from ..users import User

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(request: AskRequest, user: User = Depends(current_user)) -> AskResponse:
    """Query pipeline: embed -> search -> rerank -> generate cited answer."""
    question = request.question.strip()
    if not question:
        raise HTTPException(400, "Question cannot be empty.")
    if len(question) > 2000:
        raise HTTPException(400, "Question is too long (2000 character limit).")

    chunks, rerank_scores = retrieve(question, user.id, request.document_ids, request.top_k)

    # Grounded path: if we retrieved anything, try to answer from the documents.
    # The grounded model abstains (INSUFFICIENT_CONTEXT) when the excerpts don't
    # answer the question OR when the message is a greeting / meta / non-document
    # question — in which case we fall through to the general assistant.
    if chunks:
        answer, markers, abstained, usage = generate_answer(question, chunks)
        if not abstained:
            citations = to_citations(chunks, rerank_scores)
            if markers:
                cited = set(markers)
                citations = [c for c in citations if c.marker in cited]
            return AskResponse(
                answer=answer,
                citations=citations,
                cited_markers=markers,
                abstained=False,
                mode="grounded",
                usage=usage,
            )

    # General path: no relevant document context (nothing retrieved, or the
    # grounded answer abstained). Answer from general knowledge, clearly labeled —
    # while still declining to invent patient-specific facts.
    answer, usage = general_answer(question)
    return AskResponse(
        answer=answer,
        citations=[],
        cited_markers=[],
        abstained=False,
        mode="general",
        usage=usage,
    )
