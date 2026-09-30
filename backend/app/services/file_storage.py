"""File storage service — persist uploaded originals to local disk.

Development: stores at {data_dir}/files/{type}/{source_id}.{ext}
Production: swap this module for S3/R2 client (same interface).
"""
from __future__ import annotations

import os
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_TYPE_DIR_MAP = {
    "pdf": "pdf",
    "document": "documents",
    "audio": "audio",
}


def _base_dir() -> Path:
    settings = get_settings()
    base = Path(settings.data_dir) / "files"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _dir_for(source_type: str) -> Path:
    subdir = _TYPE_DIR_MAP.get(source_type, source_type)
    d = _base_dir() / subdir
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_file(source_id: str, data: bytes, source_type: str, filename: str) -> str:
    """Save file bytes to disk. Returns relative path from data_dir."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    dir_path = _dir_for(source_type)
    fname = f"{source_id}.{ext}"
    file_path = dir_path / fname
    file_path.write_bytes(data)
    rel = f"files/{_TYPE_DIR_MAP.get(source_type, source_type)}/{fname}"
    logger.info("Saved %s file: %s (%d bytes)", source_type, rel, len(data))
    return rel


def _safe_path(relative_path: str) -> Path | None:
    """Resolve a relative path, rejecting traversal outside data_dir."""
    base = Path(get_settings().data_dir).resolve()
    full = (base / relative_path).resolve()
    try:
        full.relative_to(base)
    except ValueError:
        logger.warning("Blocked path traversal attempt: %s", relative_path)
        return None
    return full


def get_file_path(relative_path: str) -> Path | None:
    """Resolve a relative file path to an absolute Path, or None."""
    full = _safe_path(relative_path)
    if full is not None and full.exists() and full.is_file():
        return full
    return None


def delete_file(relative_path: str) -> bool:
    """Delete a file by relative path. Returns True if deleted."""
    full = _safe_path(relative_path)
    if full is not None and full.exists():
        full.unlink()
        return True
    return False


def cleanup_if_unreferenced(relative_path: str, source_id: str | None = None) -> bool:
    """Delete a saved upload unless a stored source still references it.

    Used when an ingestion pipeline fails after the original file was
    already written — without this the bytes stay on disk forever with no
    source record pointing at them.
    """
    from app.services import store  # local import: avoid circular dependency

    try:
        for s in store.list_sources():
            if s.get("file_path") == relative_path:
                return False
            if source_id and s.get("source_id") == source_id:
                return False
    except Exception as exc:  # noqa: BLE001 — never fail cleanup loudly
        logger.warning("Could not check references for %s: %s", relative_path, exc)
        return False
    return delete_file(relative_path)


def storage_stats() -> tuple[int, int]:
    """Return (file_count, total_bytes) across all stored files."""
    base = _base_dir()
    count = 0
    total = 0
    for f in base.rglob("*"):
        if f.is_file():
            count += 1
            total += f.stat().st_size
    return count, total
