from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import chat, documents

app = FastAPI(
    title="MediCite API",
    description="RAG-powered clinical document Q&A with page-level citations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/")
def root() -> dict:
    """Friendly landing response so the base URL isn't a bare 404."""
    return {
        "service": "MediCite API",
        "description": "RAG-powered clinical document Q&A with page-level citations.",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "vector_store": settings.vector_store,
        "storage_backend": settings.storage_backend,
        "embedding_model": settings.embedding_model,
        "llm_provider": settings.llm_provider,
        "answer_model": settings.groq_model if settings.llm_provider == "groq" else settings.gemini_model,
    }
