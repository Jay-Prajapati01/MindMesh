"""Smart text chunking with sentence-aware splitting and overlap."""
from __future__ import annotations

import re

from app.core.config import get_settings

_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[str]:
    """Split text into overlapping chunks, respecting sentence boundaries."""
    settings = get_settings()
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap

    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return []

    sentences = _SENTENCE_RE.split(text)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            # start next chunk with an overlap tail from the previous chunk
            tail = current[-overlap:] if overlap and current else ""
            current = f"{tail} {sentence}".strip()

    if current:
        chunks.append(current)
    return chunks
