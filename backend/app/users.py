"""User storage — mirrors the vector-store pattern: a JSON file locally, a
Postgres table when the app is configured for pgvector.

Note on the local backend: the JSON file lives on the app's disk, which is
ephemeral on free hosting tiers — accounts reset on redeploy. Use the Postgres
backend (VECTOR_STORE=pgvector + DATABASE_URL) for accounts that persist.
"""

from __future__ import annotations

import json
import threading
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from .config import settings


@dataclass
class User:
    id: str
    email: str
    name: str
    password_hash: str
    created_at: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class LocalUserStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._path = settings.index_dir / "users.json"
        self._users: dict[str, User] = {}
        self._load()

    def _load(self) -> None:
        if self._path.exists():
            try:
                raw = json.loads(self._path.read_text(encoding="utf-8"))
                self._users = {u["id"]: User(**u) for u in raw}
            except (json.JSONDecodeError, TypeError):
                self._users = {}

    def _persist(self) -> None:
        settings.index_dir.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps([asdict(u) for u in self._users.values()]), encoding="utf-8"
        )

    def get_by_email(self, email: str) -> User | None:
        target = email.strip().lower()
        return next((u for u in self._users.values() if u.email == target), None)

    def get_by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    def create(self, email: str, name: str, password_hash: str) -> User:
        user = User(
            id=str(uuid.uuid4()),
            email=email.strip().lower(),
            name=name.strip(),
            password_hash=password_hash,
            created_at=_now(),
        )
        with self._lock:
            self._users[user.id] = user
            self._persist()
        return user


class PgUserStore:
    def __init__(self, dsn: str) -> None:
        import psycopg

        self._psycopg = psycopg
        self._dsn = dsn
        with psycopg.connect(dsn, autocommit=True) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id            TEXT PRIMARY KEY,
                    email         TEXT UNIQUE NOT NULL,
                    name          TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )

    def _row_to_user(self, row) -> User:
        return User(
            id=row[0],
            email=row[1],
            name=row[2],
            password_hash=row[3],
            created_at=row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4]),
        )

    def get_by_email(self, email: str) -> User | None:
        with self._psycopg.connect(self._dsn, autocommit=True) as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, name, password_hash, created_at FROM users WHERE email = %s",
                (email.strip().lower(),),
            )
            row = cur.fetchone()
            return self._row_to_user(row) if row else None

    def get_by_id(self, user_id: str) -> User | None:
        with self._psycopg.connect(self._dsn, autocommit=True) as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, name, password_hash, created_at FROM users WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            return self._row_to_user(row) if row else None

    def create(self, email: str, name: str, password_hash: str) -> User:
        user_id = str(uuid.uuid4())
        with self._psycopg.connect(self._dsn, autocommit=True) as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, email, name, password_hash) VALUES (%s, %s, %s, %s) "
                "RETURNING id, email, name, password_hash, created_at",
                (user_id, email.strip().lower(), name.strip(), password_hash),
            )
            return self._row_to_user(cur.fetchone())


def build_user_store():
    if settings.vector_store == "pgvector":
        return PgUserStore(settings.database_url)
    return LocalUserStore()


user_store = build_user_store()
