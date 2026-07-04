"""Semantic search endpoint."""
from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import SearchHit, SearchRequest, SearchResponse
from app.services import embeddings, store, vectorstore

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(payload: SearchRequest) -> SearchResponse:
    settings = get_settings()
    top_k = payload.top_k or settings.top_k
    store.add_search(payload.query)
    vector = await embeddings.embed_text(payload.query)
    raw_hits = vectorstore.search(vector, top_k, source_type=payload.source_type)
    hits = [
        SearchHit(
            score=hit["score"],
            text=hit.get("text", ""),
            source_id=hit.get("source_id", ""),
            source_type=hit.get("source_type", "unknown"),
            title=hit.get("title"),
            url=hit.get("channel") or hit.get("file_path"),
            thumbnail=hit.get("thumbnail"),
        )
        for hit in raw_hits
    ]
    return SearchResponse(query=payload.query, hits=hits)
