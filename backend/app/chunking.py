"""Phase 2 — recursive chunking that respects document structure.

Rules that matter for citation quality:
  * never merge blocks from different pages into one chunk (a chunk maps to
    exactly one page, so every citation resolves to a single viewer page)
  * never merge across a section boundary
  * split oversized paragraphs on sentence boundaries, not mid-sentence
  * carry ~100 tokens of trailing context into the next chunk for continuity
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field

from .config import settings
from .extraction import Block

CHARS_PER_TOKEN = 4  # good enough approximation for chunk sizing


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


@dataclass
class Chunk:
    id: str
    document_id: str
    text: str
    page_number: int
    section_title: str | None
    ordinal: int
    token_estimate: int
    embedding: list[float] = field(default_factory=list)


_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")


def _split_sentences(text: str) -> list[str]:
    parts = [p.strip() for p in _SENTENCE_RE.split(text) if p.strip()]
    return parts or [text]


def _split_long_text(text: str, max_tokens: int) -> list[str]:
    """Recursive descent: paragraph -> sentences -> hard character split."""
    if estimate_tokens(text) <= max_tokens:
        return [text]

    pieces: list[str] = []
    buffer = ""
    for sentence in _split_sentences(text):
        candidate = f"{buffer} {sentence}".strip() if buffer else sentence
        if estimate_tokens(candidate) > max_tokens and buffer:
            pieces.append(buffer)
            buffer = sentence
        else:
            buffer = candidate
    if buffer:
        pieces.append(buffer)

    # A single sentence longer than the budget (tables, long lab lists) still
    # needs splitting — fall back to a hard character cut.
    out: list[str] = []
    limit = max_tokens * CHARS_PER_TOKEN
    for piece in pieces:
        if len(piece) <= limit:
            out.append(piece)
        else:
            out.extend(piece[i : i + limit] for i in range(0, len(piece), limit))
    return out


def _overlap_tail(text: str, overlap_tokens: int) -> str:
    """Take the last ~N tokens, snapped to a sentence boundary where possible."""
    budget = overlap_tokens * CHARS_PER_TOKEN
    if len(text) <= budget:
        return text
    tail = text[-budget:]
    sentences = _split_sentences(tail)
    return " ".join(sentences[1:]) if len(sentences) > 1 else tail


def chunk_blocks(document_id: str, blocks: list[Block]) -> list[Chunk]:
    chunks: list[Chunk] = []
    ordinal = 0

    # Group by (page, section) so a chunk never straddles either boundary.
    groups: list[tuple[int, str | None, list[Block]]] = []
    for block in blocks:
        key = (block.page_number, block.section_title)
        if groups and (groups[-1][0], groups[-1][1]) == key:
            groups[-1][2].append(block)
        else:
            groups.append((block.page_number, block.section_title, [block]))

    for page_number, section_title, group in groups:
        buffer = ""
        carry = ""  # overlap text pulled from the previous chunk in this group

        def flush() -> None:
            nonlocal buffer, carry, ordinal
            text = buffer.strip()
            if not text:
                return
            chunks.append(
                Chunk(
                    id=str(uuid.uuid4()),
                    document_id=document_id,
                    text=text,
                    page_number=page_number,
                    section_title=section_title,
                    ordinal=ordinal,
                    token_estimate=estimate_tokens(text),
                )
            )
            ordinal += 1
            carry = _overlap_tail(text, settings.chunk_overlap_tokens)
            buffer = ""

        for block in group:
            for piece in _split_long_text(block.text, settings.chunk_max_tokens):
                if not buffer and carry:
                    buffer = carry
                candidate = f"{buffer}\n\n{piece}".strip() if buffer else piece
                if estimate_tokens(candidate) > settings.chunk_target_tokens and buffer:
                    flush()
                    buffer = f"{carry}\n\n{piece}".strip() if carry else piece
                else:
                    buffer = candidate

        flush()

    return chunks
