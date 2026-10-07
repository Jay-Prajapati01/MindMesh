"""Qdrant vector store wrapper."""
from __future__ import annotations

import time
import uuid
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import get_settings
from app.core.tenant import cloud, scope
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: QdrantClient | None = None
_ready = False
_MAX_RETRIES = 3
_RETRY_DELAY = 2.0


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        settings = get_settings()
        last_error = None
        for attempt in range(_MAX_RETRIES):
            try:
                _client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
                # Verify connection
                _client.get_collections()
                logger.info("Connected to Qdrant at %s", settings.qdrant_url)
                return _client
            except Exception as e:
                last_error = e
                logger.warning("Qdrant connection attempt %d/%d failed: %s", attempt + 1, _MAX_RETRIES, e)
                if attempt < _MAX_RETRIES - 1:
                    time.sleep(_RETRY_DELAY * (attempt + 1))
        raise ConnectionError(f"Failed to connect to Qdrant after {_MAX_RETRIES} attempts: {last_error}")
    return _client


def ensure_collection() -> None:
    """Create the collection if it does not already exist.

    Result is cached per process: after the first successful check the RPC
    is skipped, but a failure (Qdrant down/restarted with a fresh volume)
    clears the cache so the next call retries.
    """
    global _ready
    if _ready:
        return
    settings = get_settings()
    client = get_client()
    existing = {c.name for c in client.get_collections().collections}
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=qmodels.VectorParams(
                size=settings.embedding_dim_for_model,
                distance=qmodels.Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection %s with dim=%d", settings.qdrant_collection, settings.embedding_dim_for_model)
    info = client.get_collection(settings.qdrant_collection)
    if info.config.params.vectors.size != settings.embedding_dim_for_model:
        raise ValueError("Embedding dimension mismatch; reindex into a new collection")
    if cloud():
        incompatible = client.count(collection_name=settings.qdrant_collection,
            count_filter=qmodels.Filter(must_not=[qmodels.FieldCondition(
                key="embedding_model", match=qmodels.MatchValue(value="BAAI/bge-m3"))]), exact=True).count
        if incompatible:
            raise ValueError("Collection contains another embedding model; select an empty BGE-M3 collection")
        for field in ("tenant_id", "user_id", "source_id"):
            client.create_payload_index(settings.qdrant_collection, field, qmodels.PayloadSchemaType.KEYWORD, wait=True)
    _ready = True


def _point_id(payload: dict[str, Any]) -> str:
    """Deterministic point ID so re-ingesting a source overwrites instead of duplicating."""
    source_id = payload.get("source_id")
    chunk_index = payload.get("chunk_index")
    if source_id is None or chunk_index is None:
        return str(uuid.uuid4())
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mindmesh:{payload.get('tenant_id', 'local')}:{source_id}:{chunk_index}"))


def upsert_chunks(
    vectors: list[list[float]],
    payloads: list[dict[str, Any]],
) -> int:
    """Upsert chunk vectors with their payloads. Returns count upserted."""
    if not vectors:
        return 0
    if cloud():
        scope()
    settings = get_settings()
    client = get_client()
    try:
        ensure_collection()
    except Exception as e:  # noqa: BLE001
        logger.warning("ensure_collection before upsert failed: %s", e)
        raise
    if len(vectors) != len(payloads) or any(len(v) != settings.embedding_dim_for_model for v in vectors):
        raise ValueError("Invalid embedding batch shape")
    if cloud():
        owner = scope()
        payloads = [{**p, "tenant_id": owner.tenant_id, "user_id": owner.user_id,
                     "document_id": p.get("source_id"), "chunk_id": str(p.get("chunk_index")),
                     "embedding_model": "BAAI/bge-m3"} for p in payloads]
    points = [
        qmodels.PointStruct(id=_point_id(payload), vector=vec, payload=payload)
        for vec, payload in zip(vectors, payloads)
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=points, wait=True)
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
    must_conditions = _ownership()
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
    try:
        results = client.search(
            collection_name=settings.qdrant_collection,
            query_vector=vector,
            limit=top_k,
            query_filter=query_filter,
        )
    except Exception as e:  # noqa: BLE001
        # Collection missing (fresh Qdrant volume) — recreate and retry once.
        logger.warning("Search failed (%s), re-ensuring collection and retrying", e)
        global _ready
        _ready = False
        ensure_collection()
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
    ownership = _ownership()
    try:
        return client.count(collection_name=settings.qdrant_collection, count_filter=qmodels.Filter(must=ownership), exact=True).count
    except Exception:  # noqa: BLE001
        return 0


def get_chunks_by_source(source_id: str, limit: int = 30) -> list[dict[str, Any]]:
    """Return stored chunk payloads for a given source_id (no vector query)."""
    settings = get_settings()
    client = get_client()
    flt = qmodels.Filter(
        must=_ownership() + [
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


def delete_by_source_id(source_id: str) -> int:
    """Delete all chunks belonging to a source_id. Returns count deleted."""
    settings = get_settings()
    client = get_client()
    flt = qmodels.Filter(
        must=_ownership() + [
            qmodels.FieldCondition(
                key="source_id",
                match=qmodels.MatchValue(value=source_id),
            )
        ]
    )
    total = client.count(collection_name=settings.qdrant_collection, count_filter=flt, exact=True).count
    client.delete(collection_name=settings.qdrant_collection,
                  points_selector=qmodels.FilterSelector(filter=flt), wait=True)
    return total


def _ownership() -> list:
    if not cloud():
        return []
    return [qmodels.FieldCondition(key="tenant_id", match=qmodels.MatchValue(value=scope().tenant_id))]
