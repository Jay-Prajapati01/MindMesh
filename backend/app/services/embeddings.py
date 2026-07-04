"""Embedding generation via Ollama (BGE-M3)."""
from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return one embedding vector per input text."""
    if not texts:
        return []
    settings = get_settings()
    vectors: list[list[float]] = []
    async with httpx.AsyncClient(base_url=settings.ollama_url, timeout=120) as client:
        for text in texts:
            resp = await client.post(
                "/api/embeddings",
                json={"model": settings.embedding_model, "prompt": text},
            )
            resp.raise_for_status()
            vectors.append(resp.json()["embedding"])
    return vectors


async def embed_text(text: str) -> list[float]:
    """Convenience wrapper for embedding a single string."""
    result = await embed_texts([text])
    return result[0]
