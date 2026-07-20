from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    # "local" (numpy, zero setup) or "pgvector" (Postgres via docker-compose)
    vector_store: str = "local"
    database_url: str = "postgresql://medicite:medicite@localhost:5433/medicite"

    # "local" disk or "s3"
    storage_backend: str = "local"
    s3_bucket: str = ""
    upload_dir: Path = DATA_DIR / "uploads"
    index_dir: Path = DATA_DIR / "index"

    # fastembed model — 384-dim, small ONNX download, no API key needed
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    # two-stage retrieval
    retrieval_top_k: int = 20
    rerank_top_k: int = 5
    reranker_model: str = "Xenova/ms-marco-MiniLM-L-6-v2"
    rerank_enabled: bool = True

    # generation
    anthropic_model: str = "claude-opus-4-8"
    max_answer_tokens: int = 2048

    # chunking (approx tokens; 1 token ~= 4 chars)
    chunk_target_tokens: int = 650
    chunk_max_tokens: int = 800
    chunk_overlap_tokens: int = 100


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.index_dir.mkdir(parents=True, exist_ok=True)
