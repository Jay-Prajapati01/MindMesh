"""Endpoints to browse ingested sources (stored videos, PDFs, etc.)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.core.logging import get_logger
from app.core.security import require_key
from app.models.schemas import SourceItem
from app.services import file_storage, graph, store, vectorstore

logger = get_logger(__name__)
router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=dict)
async def list_sources(
    source_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    """List all ingested sources with pagination, optionally filtered by type."""
    all_sources = store.list_sources(source_type)
    total = len(all_sources)
    start = (page - 1) * page_size
    end = start + page_size
    items = [SourceItem(**s) for s in all_sources[start:end]]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


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


@router.get("/{source_id}/view")
async def view_source(source_id: str):
    """Open the original file inline in the browser (PDF/audio/doc preview)."""
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
                media_type=s.get("mime_type") or "application/octet-stream",
                content_disposition_type="inline",
            )
    raise HTTPException(status_code=404, detail="Source not found")


@router.delete("/{source_id}", dependencies=[Depends(require_key)])
async def delete_source(source_id: str):
    """Delete a source and all its associated data (file, chunks, metadata)."""
    sources = store.list_sources()
    source_found = None
    
    for s in sources:
        if s.get("source_id") == source_id:
            source_found = s
            break
    
    if not source_found:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # 1. Delete the original file if it exists
    file_path = source_found.get("file_path")
    if file_path:
        file_storage.delete_file(file_path)
    
    # 2. Delete chunks from Qdrant
    try:
        vectorstore.delete_by_source_id(source_id)
    except Exception as e:
        logger.warning("Failed to delete Qdrant chunks for %s: %s", source_id, e)
    
    # 3. Delete from store
    store.delete_source(source_id)

    # 4. Remove orphaned knowledge-graph nodes/edges
    try:
        graph.remove_source(source_id)
    except Exception as e:
        logger.warning("Failed to clean graph for %s: %s", source_id, e)

    logger.info("Deleted source: %s", source_id)
    return {"deleted": source_id, "message": "Source deleted successfully"}
