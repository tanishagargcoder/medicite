from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from ..chunking import chunk_blocks
from ..embeddings import embed_documents
from ..extraction import UnsupportedFileType, extract
from ..schemas import DocumentSummary
from ..storage import file_storage
from ..store import DocumentRecord, store, utc_now_iso

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024


@router.post("", response_model=DocumentSummary, status_code=201)
async def upload_document(file: UploadFile = File(...)) -> DocumentSummary:
    """Ingestion pipeline: upload -> extract -> chunk -> embed -> store."""
    data = await file.read()
    if not data:
        raise HTTPException(400, "Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit.")

    filename = file.filename or "document.pdf"

    try:
        blocks, page_count = extract(filename, data)
    except UnsupportedFileType as exc:
        raise HTTPException(415, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(422, f"Could not read {filename}: {exc}") from exc

    if not blocks:
        raise HTTPException(
            422,
            "No text found. This looks like a scanned document — it needs OCR before upload.",
        )

    document_id = str(uuid.uuid4())
    chunks = chunk_blocks(document_id, blocks)

    vectors = embed_documents([c.text for c in chunks])
    for chunk, vector in zip(chunks, vectors):
        chunk.embedding = vector

    file_storage.save(document_id, filename, data)

    record = DocumentRecord(
        id=document_id,
        filename=filename,
        page_count=page_count,
        chunk_count=len(chunks),
        uploaded_at=utc_now_iso(),
        status="ready",
    )
    store.add_document(record, chunks)

    return DocumentSummary(**record.__dict__)


@router.get("", response_model=list[DocumentSummary])
def list_documents() -> list[DocumentSummary]:
    return [DocumentSummary(**d.__dict__) for d in store.list_documents()]


@router.get("/{document_id}/file")
def get_document_file(document_id: str) -> Response:
    """Serve the original bytes so the viewer can render and jump to a cited page."""
    if store.get_document(document_id) is None:
        raise HTTPException(404, "Document not found.")
    loaded = file_storage.load(document_id)
    if loaded is None:
        raise HTTPException(404, "Original file is no longer available.")
    data, media_type = loaded
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": "inline", "Cache-Control": "private, max-age=3600"},
    )


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: str) -> Response:
    if not store.delete_document(document_id):
        raise HTTPException(404, "Document not found.")
    file_storage.delete(document_id)
    return Response(status_code=204)
