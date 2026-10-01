"""Semantic search endpoint."""
import time

from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import SearchHit, SearchRequest, SearchResponse
from app.services import embeddings, store, vectorstore

router = APIRouter(prefix="/search", tags=["search"])


def _is_http_url(value: str | None) -> bool:
    """Only http(s) strings are safe to use as links."""
    return bool(value) and str(value).startswith(("http://", "https://"))


def _resolve_hit_url(hit: dict, source_type: str, source_id: str, settings) -> str | None:
    """Resolve a safe URL for a search hit.

    Never falls back to `channel`/`file_path` unless they are real http(s) URLs —
    `channel` usually holds a channel NAME (e.g. "MrBeast"), not a link.
    """
    url = hit.get("url") or ""
    if _is_http_url(url):
        return url
    if source_type in ("pdf", "document", "audio"):
        return f"{settings.api_prefix}/sources/{source_id}/download" if source_id else None
    channel = hit.get("channel") or ""
    if _is_http_url(channel):
        return channel
    return None


def _note_hits(query: str, source_type: str | None) -> list[SearchHit]:
    """Match Workspace notes by plain text (notes are not embedded).

    Returns hits with `source_type="note"` so notes are discoverable through
    search without changing RAG/chat behaviour.
    """
    if source_type and source_type != "note":
        return []
    needle = query.lower()
    tokens = [t for t in needle.split() if len(t) >= 2]
    hits: list[SearchHit] = []
    for note in store.list_notes():
        note_id = str(note.get("id", ""))
        if not note_id:
            continue
        title = str(note.get("title") or "")
        body = str(note.get("body") or "")
        haystack_title = title.lower()
        haystack_body = body.lower()
        if needle and needle in haystack_title:
            score = 0.95
        elif needle and needle in haystack_body:
            score = 0.85
        elif tokens and all(t in haystack_title or t in haystack_body for t in tokens):
            score = 0.8 if tokens[0] in haystack_title else 0.7
        else:
            continue
        text = body.strip() or title
        if len(text) > 500:
            text = text[:500].rstrip() + "…"
        hits.append(
            SearchHit(
                score=score,
                text=text,
                source_id=note_id,
                source_type="note",
                title=title or "Untitled note",
                url=None,
                thumbnail=None,
            )
        )
    return hits


@router.post("", response_model=SearchResponse)
async def search(payload: SearchRequest) -> SearchResponse:
    settings = get_settings()
    top_k = payload.top_k or settings.top_k
    query = payload.query

    # Blank queries have nothing to match: answer gracefully without
    # embedding an empty string (which would return arbitrary chunks).
    if not query:
        return SearchResponse(
            query=query,
            hits=[],
            search_time_ms=0,
            chunks_searched=0,
            sources_searched=0,
        )

    store.add_search(query)
    start = time.time()
    vector = await embeddings.embed_text(query)
    raw_hits = vectorstore.search(vector, top_k, source_type=payload.source_type)
    search_time_ms = int((time.time() - start) * 1000)
    hits = []
    for hit in raw_hits:
        source_id = hit.get("source_id", "")
        source_type = hit.get("source_type", "unknown")
        url = _resolve_hit_url(hit, source_type, source_id, settings)

        hits.append(
            SearchHit(
                score=hit["score"],
                text=hit.get("text", ""),
                source_id=source_id,
                source_type=source_type,
                title=hit.get("title"),
                url=url,
                thumbnail=hit.get("thumbnail"),
            )
        )

    # Merge note matches (plain-text) and rank everything by score.
    hits.extend(_note_hits(query, payload.source_type))
    hits.sort(key=lambda h: h.score, reverse=True)

    return SearchResponse(
        query=query,
        hits=hits,
        search_time_ms=search_time_ms,
        chunks_searched=len(raw_hits),
        sources_searched=len({h.get("source_id") for h in raw_hits}),
    )
