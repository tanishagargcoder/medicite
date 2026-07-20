"""Phase 1 — extract text while preserving page numbers.

Page numbers are the backbone of citations, so every block of text carries the
page it came from all the way through chunking and into the answer.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass

import fitz  # PyMuPDF
from docx import Document as DocxDocument

# Section headers common in clinical documents. Detecting these lets us label
# each chunk ("Assessment and Plan", "Medications") which shows up in the
# citation card and materially helps the reranker.
MEDICAL_SECTIONS = [
    "chief complaint",
    "history of present illness",
    "hpi",
    "past medical history",
    "past surgical history",
    "family history",
    "social history",
    "review of systems",
    "allergies",
    "medications",
    "current medications",
    "physical examination",
    "physical exam",
    "vital signs",
    "laboratory results",
    "labs",
    "imaging",
    "radiology",
    "pathology",
    "microbiology",
    "assessment",
    "assessment and plan",
    "impression",
    "plan",
    "diagnosis",
    "discharge summary",
    "discharge medications",
    "hospital course",
    "procedure",
    "operative note",
    "follow up",
    "follow-up",
    "recommendations",
    # research-paper sections, since clinicians upload literature too
    "abstract",
    "background",
    "methods",
    "results",
    "discussion",
    "conclusion",
    "references",
]

_SECTION_RE = re.compile(
    r"^\s*(?:\d+(?:\.\d+)*[\).]?\s+)?(" + "|".join(re.escape(s) for s in MEDICAL_SECTIONS) + r")\s*:?\s*$",
    re.IGNORECASE,
)


@dataclass
class Block:
    """A paragraph-ish unit of text with the page it came from."""

    text: str
    page_number: int  # 1-based
    section_title: str | None = None


class UnsupportedFileType(Exception):
    pass


def looks_like_section_header(line: str) -> str | None:
    stripped = line.strip()
    if not stripped or len(stripped) > 80:
        return None
    match = _SECTION_RE.match(stripped)
    if match:
        return match.group(1).title()

    # A "KEY: value" line is a metadata field, not a section header. Clinical
    # documents are full of them (MRN:, DOB:, ADMISSION DATE:) and they would
    # otherwise trip the ALL-CAPS rule below and shred the document into
    # one-line sections.
    if re.match(r"^[^:]+:\s*\S", stripped):
        return None

    # ALL-CAPS short lines are section headers in most clinical note templates.
    letters = [c for c in stripped if c.isalpha()]
    if letters and all(c.isupper() for c in letters) and len(stripped.split()) <= 6:
        return stripped.rstrip(":").title()
    return None


def _blocks_from_page(page_text: str, page_number: int, section: str | None) -> tuple[list[Block], str | None]:
    """Split one page into blocks, line by line.

    Blank-line splitting alone is not enough: many PDF producers (and PyMuPDF's
    own text extraction) collapse blank lines, which would leave an entire page
    as a single paragraph and hide every section header after the first. So we
    break on headers as well as on blank lines.
    """
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", page_text)  # rejoin hyphen-broken words
    blocks: list[Block] = []
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer
        body = re.sub(r"[ \t]+", " ", "\n".join(buffer)).strip()
        if body:
            blocks.append(Block(text=body, page_number=page_number, section_title=section))
        buffer = []

    for raw_line in text.split("\n"):
        line = raw_line.rstrip()
        if not line.strip():
            flush()
            continue

        header = looks_like_section_header(line)
        if header:
            flush()  # the previous section's text ends here
            section = header
            continue

        buffer.append(line)

    flush()
    return blocks, section


def extract_pdf(data: bytes) -> tuple[list[Block], int]:
    blocks: list[Block] = []
    section: str | None = None

    with fitz.open(stream=data, filetype="pdf") as doc:
        page_count = doc.page_count
        for page_index, page in enumerate(doc, start=1):
            # Sections carry across page breaks — a long "Hospital Course" does
            # not restart just because the page did.
            page_blocks, section = _blocks_from_page(page.get_text("text"), page_index, section)
            blocks.extend(page_blocks)

    return blocks, page_count


def extract_docx(data: bytes) -> tuple[list[Block], int]:
    """DOCX has no real pages. We synthesize page breaks every ~3000 chars so
    citations still point somewhere meaningful in the viewer."""
    doc = DocxDocument(io.BytesIO(data))
    blocks: list[Block] = []
    current_section: str | None = None
    chars_on_page = 0
    page_number = 1
    CHARS_PER_PAGE = 3000

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        style = (para.style.name or "").lower() if para.style else ""
        header = looks_like_section_header(text)
        if header or style.startswith("heading"):
            current_section = header or text.rstrip(":").title()
            if header:
                continue

        if chars_on_page + len(text) > CHARS_PER_PAGE and chars_on_page > 0:
            page_number += 1
            chars_on_page = 0

        blocks.append(Block(text=text, page_number=page_number, section_title=current_section))
        chars_on_page += len(text)

    return blocks, page_number


def extract(filename: str, data: bytes) -> tuple[list[Block], int]:
    lowered = filename.lower()
    if lowered.endswith(".pdf"):
        return extract_pdf(data)
    if lowered.endswith(".docx"):
        return extract_docx(data)
    raise UnsupportedFileType(f"Unsupported file type: {filename}. Upload a PDF or DOCX.")
