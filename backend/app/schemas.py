from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class DocumentSummary(BaseModel):
    id: str
    filename: str
    page_count: int
    chunk_count: int
    uploaded_at: datetime
    status: Literal["processing", "ready", "failed"] = "ready"
    error: str | None = None


class Citation(BaseModel):
    """One retrieved chunk the answer is allowed to cite."""

    marker: int = Field(description="1-based index shown to the model as [1], [2] ...")
    chunk_id: str
    document_id: str
    filename: str
    page_number: int
    section_title: str | None = None
    snippet: str
    retrieval_score: float
    rerank_score: float | None = None


class AskRequest(BaseModel):
    question: str
    document_ids: list[str] | None = None
    top_k: int | None = None


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    cited_markers: list[int]
    abstained: bool
    # "grounded" = answered from the documents (with citations);
    # "general"  = answered from general knowledge (no document match).
    mode: Literal["grounded", "general"] = "grounded"
    usage: dict[str, int] = {}
