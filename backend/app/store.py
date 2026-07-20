"""Vector storage with two interchangeable backends.

  * LocalStore   — numpy cosine similarity over a JSON index. Zero setup, so
                   the project clones and runs.
  * PgVectorStore — Postgres + pgvector with an IVFFlat index. This is the
                   production path and the one the CV pitch describes; point
                   DATABASE_URL at AWS RDS and it works unchanged.

Both expose the same three operations, so retrieval.py never branches on
which one is active.
"""

from __future__ import annotations

import json
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import numpy as np

from .chunking import Chunk
from .config import settings


@dataclass
class StoredChunk:
    id: str
    document_id: str
    filename: str
    text: str
    page_number: int
    section_title: str | None
    ordinal: int
    score: float = 0.0


@dataclass
class DocumentRecord:
    id: str
    filename: str
    page_count: int
    chunk_count: int
    uploaded_at: str
    status: str = "ready"
    error: str | None = None


class LocalStore:
    """JSON metadata + a .npy matrix of embeddings, held in memory."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._docs: dict[str, DocumentRecord] = {}
        self._chunks: list[dict] = []
        self._matrix: np.ndarray = np.zeros((0, settings.embedding_dim), dtype=np.float32)
        self._meta_path = settings.index_dir / "index.json"
        self._vec_path = settings.index_dir / "vectors.npy"
        self._load()

    def _load(self) -> None:
        if self._meta_path.exists():
            payload = json.loads(self._meta_path.read_text(encoding="utf-8"))
            self._docs = {d["id"]: DocumentRecord(**d) for d in payload.get("documents", [])}
            self._chunks = payload.get("chunks", [])
        if self._vec_path.exists():
            self._matrix = np.load(self._vec_path)
        # Guard against a half-written index from an interrupted run.
        if len(self._chunks) != self._matrix.shape[0]:
            self._chunks, self._docs = [], {}
            self._matrix = np.zeros((0, settings.embedding_dim), dtype=np.float32)

    def _persist(self) -> None:
        settings.index_dir.mkdir(parents=True, exist_ok=True)  # resilient if the dir was removed
        payload = {
            "documents": [asdict(d) for d in self._docs.values()],
            "chunks": self._chunks,
        }
        self._meta_path.write_text(json.dumps(payload), encoding="utf-8")
        np.save(self._vec_path, self._matrix)

    def add_document(self, doc: DocumentRecord, chunks: list[Chunk]) -> None:
        vectors = np.array([c.embedding for c in chunks], dtype=np.float32)
        # Normalize once at write time so search is a plain dot product.
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        vectors = vectors / np.clip(norms, 1e-9, None)

        with self._lock:
            self._docs[doc.id] = doc
            self._chunks.extend(
                {
                    "id": c.id,
                    "document_id": c.document_id,
                    "text": c.text,
                    "page_number": c.page_number,
                    "section_title": c.section_title,
                    "ordinal": c.ordinal,
                }
                for c in chunks
            )
            self._matrix = np.vstack([self._matrix, vectors]) if self._matrix.size else vectors
            self._persist()

    def search(self, query_vector: list[float], top_k: int, document_ids: list[str] | None) -> list[StoredChunk]:
        with self._lock:
            if not self._chunks:
                return []
            query = np.array(query_vector, dtype=np.float32)
            query /= max(float(np.linalg.norm(query)), 1e-9)
            scores = self._matrix @ query

            candidate_idx = np.arange(len(self._chunks))
            if document_ids:
                allowed = set(document_ids)
                mask = np.array([c["document_id"] in allowed for c in self._chunks])
                candidate_idx = candidate_idx[mask]
                if candidate_idx.size == 0:
                    return []
                scores = scores[mask]

            k = min(top_k, candidate_idx.size)
            top = np.argpartition(-scores, k - 1)[:k]
            top = top[np.argsort(-scores[top])]

            results = []
            for local_i in top:
                chunk = self._chunks[int(candidate_idx[local_i])]
                results.append(
                    StoredChunk(
                        id=chunk["id"],
                        document_id=chunk["document_id"],
                        filename=self._docs[chunk["document_id"]].filename,
                        text=chunk["text"],
                        page_number=chunk["page_number"],
                        section_title=chunk["section_title"],
                        ordinal=chunk["ordinal"],
                        score=float(scores[local_i]),
                    )
                )
            return results

    def list_documents(self) -> list[DocumentRecord]:
        with self._lock:
            return sorted(self._docs.values(), key=lambda d: d.uploaded_at, reverse=True)

    def get_document(self, document_id: str) -> DocumentRecord | None:
        return self._docs.get(document_id)

    def delete_document(self, document_id: str) -> bool:
        with self._lock:
            if document_id not in self._docs:
                return False
            keep = [i for i, c in enumerate(self._chunks) if c["document_id"] != document_id]
            self._chunks = [self._chunks[i] for i in keep]
            self._matrix = (
                self._matrix[keep] if keep else np.zeros((0, settings.embedding_dim), dtype=np.float32)
            )
            del self._docs[document_id]
            self._persist()
            return True


class PgVectorStore:
    """Postgres + pgvector. Same interface as LocalStore."""

    def __init__(self, dsn: str) -> None:
        import psycopg
        from pgvector.psycopg import register_vector

        self._psycopg = psycopg
        self._register_vector = register_vector
        self._dsn = dsn
        self._init_schema()

    def _connect(self):
        conn = self._psycopg.connect(self._dsn, autocommit=True)
        self._register_vector(conn)
        return conn

    def _init_schema(self) -> None:
        with self._psycopg.connect(self._dsn, autocommit=True) as conn:
            conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id            TEXT PRIMARY KEY,
                    filename      TEXT NOT NULL,
                    page_count    INT  NOT NULL,
                    chunk_count   INT  NOT NULL,
                    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
                    status        TEXT NOT NULL DEFAULT 'ready',
                    error         TEXT
                )
                """
            )
            conn.execute(
                f"""
                CREATE TABLE IF NOT EXISTS chunks (
                    id            TEXT PRIMARY KEY,
                    document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    text          TEXT NOT NULL,
                    page_number   INT  NOT NULL,
                    section_title TEXT,
                    ordinal       INT  NOT NULL,
                    embedding     vector({settings.embedding_dim}) NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id)")
            # IVFFlat on cosine distance. Build after data exists for best recall;
            # creating it empty is fine and Postgres will use it once populated.
            conn.execute(
                "CREATE INDEX IF NOT EXISTS chunks_embedding_idx "
                "ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
            )

    def add_document(self, doc: DocumentRecord, chunks: list[Chunk]) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO documents (id, filename, page_count, chunk_count, uploaded_at, status, error)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    chunk_count = EXCLUDED.chunk_count,
                    status = EXCLUDED.status,
                    error = EXCLUDED.error
                """,
                (doc.id, doc.filename, doc.page_count, doc.chunk_count, doc.uploaded_at, doc.status, doc.error),
            )
            with conn.cursor() as cur:
                cur.executemany(
                    """
                    INSERT INTO chunks (id, document_id, text, page_number, section_title, ordinal, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    [
                        (
                            c.id,
                            c.document_id,
                            c.text,
                            c.page_number,
                            c.section_title,
                            c.ordinal,
                            np.array(c.embedding, dtype=np.float32),
                        )
                        for c in chunks
                    ],
                )

    def search(self, query_vector: list[float], top_k: int, document_ids: list[str] | None) -> list[StoredChunk]:
        # 1 - cosine_distance == cosine similarity, so scores match LocalStore.
        sql = """
            SELECT c.id, c.document_id, d.filename, c.text, c.page_number,
                   c.section_title, c.ordinal, 1 - (c.embedding <=> %s) AS score
            FROM chunks c
            JOIN documents d ON d.id = c.document_id
        """
        params: list = [np.array(query_vector, dtype=np.float32)]
        if document_ids:
            sql += " WHERE c.document_id = ANY(%s)"
            params.append(list(document_ids))
        sql += " ORDER BY c.embedding <=> %s LIMIT %s"
        params.extend([np.array(query_vector, dtype=np.float32), top_k])

        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            return [
                StoredChunk(
                    id=r[0],
                    document_id=r[1],
                    filename=r[2],
                    text=r[3],
                    page_number=r[4],
                    section_title=r[5],
                    ordinal=r[6],
                    score=float(r[7]),
                )
                for r in cur.fetchall()
            ]

    def list_documents(self) -> list[DocumentRecord]:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, filename, page_count, chunk_count, uploaded_at, status, error "
                "FROM documents ORDER BY uploaded_at DESC"
            )
            return [
                DocumentRecord(
                    id=r[0],
                    filename=r[1],
                    page_count=r[2],
                    chunk_count=r[3],
                    uploaded_at=r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4]),
                    status=r[5],
                    error=r[6],
                )
                for r in cur.fetchall()
            ]

    def get_document(self, document_id: str) -> DocumentRecord | None:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, filename, page_count, chunk_count, uploaded_at, status, error "
                "FROM documents WHERE id = %s",
                (document_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return DocumentRecord(
                id=row[0],
                filename=row[1],
                page_count=row[2],
                chunk_count=row[3],
                uploaded_at=row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4]),
                status=row[5],
                error=row[6],
            )

    def delete_document(self, document_id: str) -> bool:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM documents WHERE id = %s", (document_id,))
            return cur.rowcount > 0


def build_store():
    if settings.vector_store == "pgvector":
        return PgVectorStore(settings.database_url)
    return LocalStore()


store = build_store()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
