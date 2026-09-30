"""Upload helpers: bounded reads so an oversized file never lands fully in memory."""
from __future__ import annotations

from fastapi import HTTPException, UploadFile

from app.core.config import get_settings

_CHUNK = 1024 * 1024  # 1 MB


def _too_large(limit: int) -> HTTPException:
    return HTTPException(
        status_code=413,
        detail=f"File exceeds the {limit // (1024 * 1024)} MB upload limit",
    )


async def read_upload(file: UploadFile, max_size: int | None = None) -> bytes:
    """Read an upload fully, rejecting it once it exceeds max_size bytes.

    Defaults to Settings.max_upload_size. Raises 413 when over the limit.
    """
    limit = max_size if max_size is not None else get_settings().max_upload_size
    if file.size is not None and file.size > limit:
        raise _too_large(limit)
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise _too_large(limit)
        chunks.append(chunk)
    return b"".join(chunks)
