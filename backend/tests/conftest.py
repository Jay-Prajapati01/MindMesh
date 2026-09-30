"""Shared test fixtures.

API tests must be hermetic: they never call Ollama, Qdrant, or any other
network service. `hermetic` patches the service layer with in-process fakes
so `pytest tests` passes on a machine with no model server or vector DB.
"""
from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from unittest.mock import patch

import pytest

# Deterministic fake embedding — same input, same vector, no model needed.
_EMBED_DIM = 32


def _vec(text: str) -> list[float]:
    seed = sum(ord(c) for c in text) % 997
    return [((seed + i) % 100) / 100 for i in range(_EMBED_DIM)]


def _fake_hits() -> list[dict]:
    return [
        {
            "text": "MindMesh is a knowledge base with citations.",
            "score": 0.91,
            "source_id": "test-source-1",
            "source_type": "web",
            "title": "Test Source",
            "url": "https://example.com/article",
            "thumbnail": None,
        }
    ]


async def _fake_embed_text(text: str) -> list[float]:
    return _vec(text)


async def _fake_embed_texts(texts: list[str]) -> list[list[float]]:
    return [_vec(t) for t in texts]


async def _fake_generate(prompt: str, system: str | None = None) -> str:
    return "This is a mocked LLM answer used by the test suite."


async def _fake_generate_stream(
    prompt: str, system: str | None = None
) -> AsyncIterator[str]:
    for token in ["Mocked ", "streamed ", "answer."]:
        yield token


def _fake_search(query_vec, top_k=None, source_type=None, source_id=None, **kwargs):
    return _fake_hits()


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def hermetic() -> Iterator[None]:
    """Patch embeddings / vector search / LLM so API tests need no services."""
    with (
        patch("app.services.embeddings.embed_text", _fake_embed_text),
        patch("app.services.embeddings.embed_texts", _fake_embed_texts),
        patch("app.services.vectorstore.search", _fake_search),
        patch("app.services.vectorstore.count", lambda: len(_fake_hits())),
        patch("app.services.llm.generate", _fake_generate),
        patch("app.services.llm.generate_stream", _fake_generate_stream),
    ):
        yield
