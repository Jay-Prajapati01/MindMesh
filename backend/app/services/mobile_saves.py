"""Durable local-development receipt store for companion quick saves."""
from __future__ import annotations

import asyncio
import importlib
import json
import uuid
from pathlib import Path

from app.core.tenant import data_directory, scope
from app.services.job_runner import HANDLERS

_tasks: dict[str, asyncio.Task] = {}


def _path() -> Path:
    path = data_directory() / "mobile-quick-saves.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _load() -> list[dict]:
    path = _path()
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def _write(rows: list[dict]) -> None:
    path = _path()
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(rows))
    temp.replace(path)


def create(kind: str, url: str, idempotency: str) -> dict:
    owner = scope()
    job_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{owner.user_id}:{idempotency}"))
    rows = _load()
    existing = next((row for row in rows if row["job_id"] == job_id), None)
    if existing:
        return existing
    row = {"job_id": job_id, "kind": kind, "url": url, "status": "queued", "result": None, "error": None}
    rows.append(row)
    _write(rows)
    return row


def owned(job_id: str) -> dict:
    row = next((item for item in _load() if item["job_id"] == job_id), None)
    if not row:
        raise KeyError(job_id)
    return row


def update(job_id: str, **changes) -> dict:
    rows = _load()
    for row in rows:
        if row["job_id"] == job_id:
            row.update(changes)
            _write(rows)
            return row
    raise KeyError(job_id)


async def run(job_id: str) -> None:
    record = owned(job_id)
    update(job_id, status="processing")
    try:
        module, handler, schema = HANDLERS[record["kind"]]
        api = importlib.import_module("app.api." + module)
        result = await getattr(api, handler)(getattr(api, schema)(url=record["url"]))
        update(job_id, status="completed", result=result.model_dump(mode="json"))
    except Exception:  # public message avoids leaking internal provider details
        update(job_id, status="failed", error={"message": "Unable to process this save. Retry it from the companion app."})


def schedule(job_id: str) -> None:
    if job_id in _tasks and not _tasks[job_id].done():
        return
    task = asyncio.create_task(run(job_id))
    _tasks[job_id] = task
    task.add_done_callback(lambda _: _tasks.pop(job_id, None))
