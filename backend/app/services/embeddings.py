"""Embedding generation via Ollama (nomic-embed-text by default).

Uses Ollama's batch /api/embed endpoint (one HTTP round-trip per batch)
and keeps a small process-wide LRU cache so repeated texts (search queries,
re-ingests) are not re-embedded.
"""
from __future__ import annotations

import hashlib
from collections import OrderedDict

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_CACHE_MAX = 2048
_cache: OrderedDict[str, list[float]] = OrderedDict()


def _key(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _cache_get(key: str) -> list[float] | None:
    vec = _cache.get(key)
    if vec is not None:
        _cache.move_to_end(key)
    return vec


def _cache_put(key: str, vec: list[float]) -> None:
    _cache[key] = vec
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


async def _embed_batch(client: httpx.AsyncClient, texts: list[str]) -> list[list[float]]:
    """Embed a batch: try modern /api/embed, fall back to per-prompt /api/embeddings."""
    settings = get_settings()
    try:
        resp = await client.post(
            "/api/embed",
            json={"model": settings.embedding_model, "input": texts, "truncate": False},
        )
        if resp.status_code in (404, 405):
            raise httpx.HTTPStatusError("batch endpoint unavailable", request=resp.request, response=resp)
        if resp.status_code >= 400:
            body = resp.text[:300]
            if "context length" in body:
                # Oversized input: retry with truncation instead of failing
                # the whole ingestion pipeline.
                logger.warning("Ollama rejected oversized input; retrying with truncate=true")
                resp = await client.post(
                    "/api/embed",
                    json={"model": settings.embedding_model, "input": texts, "truncate": True},
                )
                if resp.status_code < 400:
                    return resp.json()["embeddings"]
                body = resp.text[:300]
            # Surface Ollama's actual reason (raise_for_status drops the body).
            raise RuntimeError(
                f"Ollama /api/embed returned {resp.status_code}: "
                f"{body} (input length={sum(len(t) for t in texts)} chars)"
            )
        return resp.json()["embeddings"]
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code not in (404, 405):
            raise
        logger.debug("Ollama /api/embed unavailable, using /api/embeddings per text")
        vectors: list[list[float]] = []
        for text in texts:
            r = await client.post(
                "/api/embeddings",
                json={"model": settings.embedding_model, "prompt": text},
            )
            r.raise_for_status()
            vectors.append(r.json()["embedding"])
        return vectors


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return one embedding vector per input text (cached, batched)."""
    if not texts:
        return []

    if get_settings().mindmesh_execution_mode == "modal":
        from app.services.modal_client import embed
        return await embed(texts)

    keys = [_key(t) for t in texts]
    results: list[list[float] | None] = [_cache_get(k) for k in keys]
    missing_idx = [i for i, v in enumerate(results) if v is None]
    if not missing_idx:
        return [v for v in results if v is not None]

    settings = get_settings()
    missing_texts = [texts[i] for i in missing_idx]
    async with httpx.AsyncClient(base_url=settings.ollama_url, timeout=120) as client:
        vectors = await _embed_batch(client, missing_texts)
    if len(vectors) != len(missing_texts):
        raise RuntimeError(
            f"Ollama returned {len(vectors)} embeddings for {len(missing_texts)} texts"
        )

    for i, vec in zip(missing_idx, vectors):
        results[i] = vec
        _cache_put(keys[i], vec)
    return [v for v in results if v is not None]


async def embed_text(text: str) -> list[float]:
    """Convenience wrapper for embedding a single string."""
    result = await embed_texts([text])
    return result[0]
