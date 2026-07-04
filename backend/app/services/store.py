"""Lightweight JSON-backed metadata store for ingested sources and activity.

This complements Qdrant (which stores vectors) by keeping human-facing
metadata: the list of ingested sources and recent search/question activity.
It is intentionally simple (single JSON file) and can be swapped for
PostgreSQL in a later phase without changing the API layer.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.schemas import RecentQuery, SourceItem

logger = get_logger(__name__)
_lock = threading.Lock()
_MAX_RECENT = 20


def _path() -> Path:
    data_dir = Path(get_settings().data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "store.json"


def _load() -> dict:
    path = _path()
    if not path.exists():
        return {"sources": [], "searches": [], "questions": []}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        logger.warning("Store file unreadable; starting fresh")
        return {"sources": [], "searches": [], "questions": []}


def _save(data: dict) -> None:
    _path().write_text(json.dumps(data, default=str, indent=2))


def add_source(item: SourceItem) -> None:
    with _lock:
        data = _load()
        # de-duplicate by source_id
        data["sources"] = [
            s for s in data["sources"] if s.get("source_id") != item.source_id
        ]
        data["sources"].insert(0, json.loads(item.model_dump_json()))
        _save(data)


def add_search(text: str) -> None:
    _add_activity("searches", text)


def add_question(text: str) -> None:
    _add_activity("questions", text)


def _add_activity(key: str, text: str) -> None:
    with _lock:
        data = _load()
        entry = json.loads(RecentQuery(text=text).model_dump_json())
        data[key].insert(0, entry)
        data[key] = data[key][:_MAX_RECENT]
        _save(data)


def list_sources(source_type: str | None = None) -> list[dict]:
    data = _load()
    sources = data.get("sources", [])
    if source_type:
        sources = [s for s in sources if s.get("source_type") == source_type]
    return sources


def recent_sources(limit: int = 8) -> list[dict]:
    return _load().get("sources", [])[:limit]


def recent_searches(limit: int = 8) -> list[dict]:
    return _load().get("searches", [])[:limit]


def recent_questions(limit: int = 8) -> list[dict]:
    return _load().get("questions", [])[:limit]


def counts_by_type() -> dict[str, int]:
    counts: dict[str, int] = {}
    for s in _load().get("sources", []):
        st = s.get("source_type", "unknown")
        counts[st] = counts.get(st, 0) + 1
    return counts


def total_sources() -> int:
    return len(_load().get("sources", []))


def chunks_by_day() -> list[dict]:
    """Return chunk counts grouped by day for the last 7 days."""
    from datetime import datetime, timezone, timedelta
    from collections import defaultdict

    sources = _load().get("sources", [])
    day_chunks: dict[str, int] = defaultdict(int)

    for s in sources:
        created = s.get("created_at")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            day_key = dt.strftime("%Y-%m-%d")
            chunks = s.get("chunks_indexed", 0)
            day_chunks[day_key] += chunks
        except (ValueError, TypeError):
            continue

    today = datetime.now(timezone.utc).date()
    result = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_key = day.strftime("%Y-%m-%d")
        label = day.strftime("%a")
        result.append({
            "date": day_key,
            "name": label,
            "chunks": day_chunks.get(day_key, 0),
        })
    return result


# --- Notes (Workspace) -------------------------------------------------


def list_notes() -> list[dict]:
    return _load().get("notes", [])


def add_note(title: str, body: str) -> dict:
    import uuid
    from datetime import datetime, timezone

    with _lock:
        data = _load()
        data.setdefault("notes", [])
        note = {
            "id": str(uuid.uuid4()),
            "title": title,
            "body": body,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        data["notes"].insert(0, note)
        _save(data)
        return note


def delete_note(note_id: str) -> bool:
    with _lock:
        data = _load()
        notes = data.get("notes", [])
        new_notes = [n for n in notes if n.get("id") != note_id]
        data["notes"] = new_notes
        _save(data)
        return len(new_notes) != len(notes)
