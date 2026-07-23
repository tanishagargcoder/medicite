from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    # Comma-separated list of frontend origins allowed by CORS. In production set
    # this to your deployed frontend URL, e.g. "https://medicite.vercel.app".
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Auth. ALWAYS set JWT_SECRET in production — the dev default is not secret,
    # and changing it invalidates every issued token.
    jwt_secret: str = "dev-only-insecure-change-me"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

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

    # generation — pick a provider, both have free tiers.
    #   "groq"   -> console.groq.com  (free tier works instantly, no project setup)
    #   "gemini" -> aistudio.google.com  (free, but the project must have free-tier access)
    llm_provider: str = "groq"

    google_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    max_answer_tokens: int = 2048

    # chunking (approx tokens; 1 token ~= 4 chars)
    chunk_target_tokens: int = 650
    chunk_max_tokens: int = 800
    chunk_overlap_tokens: int = 100


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.index_dir.mkdir(parents=True, exist_ok=True)
