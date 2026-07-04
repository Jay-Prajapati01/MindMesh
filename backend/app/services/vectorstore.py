"""Qdrant vector store wrapper."""
from __future__ import annotations

import uuid
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = QdrantClient(url=settings.qdrant_url)
    return _client


def ensure_collection() -> None:
    """Create the collection if it does not already exist."""
    settings = get_settings()
    client = get_client()
    existing = {c.name for c in client.get_collections().collections}
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(
                size=settings.embedding_dim,
                distance=qmodels.Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection %s", settings.qdrant_collection)


def upsert_chunks(
    vectors: list[list[float]],
    payloads: list[dict[str, Any]],
) -> int:
    """Upsert chunk vectors with their payloads. Returns count upserted."""
    if not vectors:
        return 0
    settings = get_settings()
    client = get_client()
    points = [
        qmodels.PointStruct(id=str(uuid.uuid4()), vector=vec, payload=payload)
        for vec, payload in zip(vectors, payloads)
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=points)
    return len(points)


def search(
    vector: list[float],
    top_k: int,
    source_type: str | None = None,
    source_id: str | None = None,
) -> list[dict[str, Any]]:
    """Return the top_k nearest payloads with scores, optionally filtered."""
    settings = get_settings()
    client = get_client()
    must_conditions = []
    if source_type:
        must_conditions.append(
            qmodels.FieldCondition(
                key="source_type",
                match=qmodels.MatchValue(value=source_type),
            )
        )
    if source_id:
        must_conditions.append(
            qmodels.FieldCondition(
                key="source_id",
                match=qmodels.MatchValue(value=source_id),
            )
        )
    query_filter = qmodels.Filter(must=must_conditions) if must_conditions else None
    results = client.search(
        collection_name=settings.qdrant_collection,
        query_vector=vector,
        limit=top_k,
        query_filter=query_filter,
    )
    return [{"score": r.score, **(r.payload or {})} for r in results]


def count() -> int:
    settings = get_settings()
    client = get_client()
    try:
        return client.count(collection_name=settings.qdrant_collection).count
    except Exception:  # noqa: BLE001
        return 0


def get_chunks_by_source(source_id: str, limit: int = 30) -> list[dict[str, Any]]:
    """Return stored chunk payloads for a given source_id (no vector query)."""
    settings = get_settings()
    client = get_client()
    flt = qmodels.Filter(
        must=[
            qmodels.FieldCondition(
                key="source_id",
                match=qmodels.MatchValue(value=source_id),
            )
        ]
    )
    points, _ = client.scroll(
        collection_name=settings.qdrant_collection,
        scroll_filter=flt,
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )
    payloads = [p.payload or {} for p in points]
    payloads.sort(key=lambda p: p.get("chunk_index", 0))
    return payloads
