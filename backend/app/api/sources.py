"""Endpoints to browse ingested sources (stored videos, PDFs, etc.)."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.logging import get_logger
from app.models.schemas import SourceItem
from app.services import file_storage, store

logger = get_logger(__name__)
router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[SourceItem])
async def list_sources(source_type: str | None = None) -> list[SourceItem]:
    """List all ingested sources, optionally filtered by type."""
    return [SourceItem(**s) for s in store.list_sources(source_type)]


@router.get("/{source_id}")
async def get_source(source_id: str) -> SourceItem:
    """Get a single source by ID."""
    sources = store.list_sources()
    for s in sources:
        if s.get("source_id") == source_id:
            return SourceItem(**s)
    raise HTTPException(status_code=404, detail="Source not found")


@router.get("/{source_id}/download")
async def download_source(source_id: str):
    """Download the original file for a source."""
    sources = store.list_sources()
    for s in sources:
        if s.get("source_id") == source_id:
            file_path = s.get("file_path")
            if not file_path:
                raise HTTPException(status_code=404, detail="No original file stored for this source")
            resolved = file_storage.get_file_path(file_path)
            if not resolved:
                raise HTTPException(status_code=404, detail="File not found on disk")
            return FileResponse(
                path=str(resolved),
                filename=s.get("file_name") or resolved.name,
                media_type=s.get("mime_type") or "application/octet-stream",
            )
    raise HTTPException(status_code=404, detail="Source not found")
