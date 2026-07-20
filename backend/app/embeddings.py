"""Phase 3 — embeddings.

Uses fastembed (ONNX, runs locally, no API key, no torch dependency). The model
is loaded lazily so the API starts instantly and only pays the download cost on
the first ingestion.

bge-small-en-v1.5 wants an instruction prefix on queries but not on documents —
skipping that asymmetry is a common and quietly costly RAG bug.
"""

from __future__ import annotations

import threading

from .config import settings

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

_model = None
_reranker = None
_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from fastembed import TextEmbedding

                _model = TextEmbedding(model_name=settings.embedding_model)
    return _model


def embed_documents(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return [vec.tolist() for vec in _get_model().embed(texts)]


def embed_query(text: str) -> list[float]:
    return next(_get_model().query_embed([text])).tolist()


def get_reranker():
    """Cross-encoder for stage 2. Returns None if unavailable so retrieval can
    fall back to vector scores rather than failing the request."""
    global _reranker
    if not settings.rerank_enabled:
        return None
    if _reranker is None:
        with _lock:
            if _reranker is None:
                try:
                    from fastembed.rerank.cross_encoder import TextCrossEncoder

                    _reranker = TextCrossEncoder(model_name=settings.reranker_model)
                except Exception:  # noqa: BLE001 - degrade gracefully
                    _reranker = False
    return _reranker or None
