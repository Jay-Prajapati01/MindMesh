"""API-key guard for mutating endpoints.

Active only when ENVIRONMENT=production and API_KEY is set, so local
development keeps working without any header.
"""
from __future__ import annotations

import secrets

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.core.config import get_settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_key(key: str | None = Security(_api_key_header)) -> None:
    """Reject requests without a valid X-API-Key in production."""
    settings = get_settings()
    if settings.environment != "production":
        return
    if not settings.api_key:
        # Production without a configured key: do not silently allow everything.
        raise HTTPException(
            status_code=503,
            detail="API key authentication is not configured (set API_KEY).",
        )
    # Constant-time comparison — a plain != leaks timing information.
    if not key or not secrets.compare_digest(key.encode(), settings.api_key.encode()):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
