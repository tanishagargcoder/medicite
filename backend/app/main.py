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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "vector_store": settings.vector_store,
        "storage_backend": settings.storage_backend,
        "embedding_model": settings.embedding_model,
        "answer_model": settings.anthropic_model,
    }
