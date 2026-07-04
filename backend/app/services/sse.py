"""Server-Sent Events (SSE) helpers for streaming progress from FastAPI."""
from __future__ import annotations

import json
from typing import Any


def sse(event: str, data: dict | str) -> str:
    """Format a single SSE message ready to be yielded."""
    if isinstance(data, dict):
        data = json.dumps(data, default=str)
    return f"event: {event}\ndata: {data}\n\n"
