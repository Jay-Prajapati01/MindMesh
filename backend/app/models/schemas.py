"""Pydantic request/response models shared across the API."""
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    environment: str
    version: str


class VideoProcessRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")


class VideoMetadata(BaseModel):
    video_id: str
    title: str | None = None
    channel: str | None = None
    duration: int | None = None
    thumbnail: str | None = None
    published_at: str | None = None


class VideoProcessResponse(BaseModel):
    video_id: str
    metadata: VideoMetadata
    summary: str | None = None
    key_topics: list[str] = []
    chunks_indexed: int = 0
    processed_at: datetime = Field(default_factory=_utcnow)


class SearchRequest(BaseModel):
    query: str
    top_k: int | None = None
    source_type: str | None = Field(
        default=None, description="Optional filter by source type"
    )


class SearchHit(BaseModel):
    score: float
    text: str
    source_id: str
    source_type: str
    title: str | None = None
    url: str | None = None
    thumbnail: str | None = None


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]


class ChatRequest(BaseModel):
    question: str
    top_k: int | None = None
    source_type: str | None = None
    source_id: str | None = None


class Citation(BaseModel):
    source_id: str
    source_type: str
    title: str | None = None
    snippet: str
    url: str | None = None
    thumbnail: str | None = None


class ChatResponse(BaseModel):
    question: str
    answer: str
    citations: list[Citation]


class SourceItem(BaseModel):
    """A record of an ingested source (video, pdf, etc.)."""

    source_id: str
    source_type: str
    title: str | None = None
    channel: str | None = None
    thumbnail: str | None = None
    summary: str | None = None
    key_topics: list[str] = []
    chunks_indexed: int = 0
    created_at: datetime = Field(default_factory=_utcnow)
    file_path: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    mime_type: str | None = None


class RecentQuery(BaseModel):
    text: str
    created_at: datetime = Field(default_factory=_utcnow)


class PDFDocument(BaseModel):
    """Structured output from the PDF pipeline."""

    title: str = ""
    author: str | None = None
    creation_date: str | None = None
    page_count: int = 0
    language: str | None = None
    file_size: int = 0
    document_type: str = "unknown"
    headings: list[str] = []
    sections: list[dict] = []
    tables: list[dict] = []
    images: list[dict] = []
    paragraphs: list[str] = []
    captions: list[str] = []
    metadata: dict = {}
    markdown: str = ""
    chunks: list[dict] = []
    needs_ocr: bool = False


class StatsResponse(BaseModel):
    indexed_chunks: int
    total_sources: int
    sources_by_type: dict[str, int]
    vector_store: str = "qdrant"
    total_files_stored: int = 0
    total_storage_bytes: int = 0
    recent_sources: list[SourceItem] = []
    recent_searches: list[RecentQuery] = []
    recent_questions: list[RecentQuery] = []
    knowledge_growth: list[dict] = []
