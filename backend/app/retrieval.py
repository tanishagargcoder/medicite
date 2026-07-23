"""Phase 4 — two-stage retrieval.

Stage 1: cosine similarity over the whole corpus -> top 20. Cheap, high recall,
         but a bi-encoder scores question and passage independently so it
         rewards topical overlap rather than actually answering the question.
Stage 2: a cross-encoder reads (question, passage) together and rescores the
         20 candidates -> top 5. Much better precision, and 20 passes is cheap.

The narrowing matters twice over: better passages, and fewer of them, so the
model has less room to pad an answer with loosely-related context.
"""

from __future__ import annotations

from .config import settings
from .embeddings import embed_query, get_reranker
from .store import StoredChunk, store


def retrieve(
    question: str,
    user_id: str,
    document_ids: list[str] | None = None,
    top_k: int | None = None,
) -> tuple[list[StoredChunk], list[float] | None]:
    """Return (chunks, rerank_scores). rerank_scores is None if the cross-encoder
    was unavailable and we fell back to pure vector ranking."""
    final_k = top_k or settings.rerank_top_k

    query_vector = embed_query(question)
    candidates = store.search(query_vector, settings.retrieval_top_k, document_ids, user_id)
    if not candidates:
        return [], None

    reranker = get_reranker()
    if reranker is None:
        return candidates[:final_k], None

    # Give the cross-encoder the section title too — "Assessment and Plan"
    # is real signal about whether a passage answers a clinical question.
    passages = [
        f"{c.section_title}: {c.text}" if c.section_title else c.text
        for c in candidates
    ]
    try:
        scores = list(reranker.rerank(question, passages))
    except Exception:  # noqa: BLE001 - never fail a query over reranking
        return candidates[:final_k], None

    ranked = sorted(zip(candidates, scores), key=lambda pair: pair[1], reverse=True)[:final_k]
    return [c for c, _ in ranked], [float(s) for _, s in ranked]
