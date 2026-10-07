"""Shared test fixtures.

API tests must be hermetic: they never call Ollama, Qdrant, or any other
network service. `hermetic` patches the service layer with in-process fakes
so `pytest tests` passes on a machine with no model server or vector DB.

`modal_app` builds a second application instance in modal (cloud) mode with
the Supabase token endpoint, membership resolver, cloud state and Qdrant all
mocked — used by the authorization and contract suites. No network, no DB.
"""
from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Deterministic fake embedding — same input, same vector, no model needed.
_EMBED_DIM = 32

MODAL_TENANT_A = "11111111-1111-1111-1111-111111111111"
MODAL_TENANT_B = "33333333-3333-3333-3333-333333333333"
MODAL_USER_ID = "22222222-2222-2222-2222-222222222222"


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


@pytest.fixture(autouse=True)
def _rate_limits_off():
    """Rate limiting is exercised explicitly in test_rate_limit.py.

    Without this, cumulative in-process counters across the whole suite would
    eventually 429 unrelated tests.
    """
    from app.core.config import get_settings
    from app.core import ratelimit

    settings = get_settings()
    previous = settings.rate_limit_enabled
    settings.rate_limit_enabled = False
    ratelimit.reset_for_tests()
    yield
    settings.rate_limit_enabled = previous
    ratelimit.reset_for_tests()


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


# --- Modal (cloud) mode app instance -----------------------------------------


class _AuthState:
    """Mutable authentication backend double for CloudAuthMiddleware."""

    def __init__(self) -> None:
        from app.core.tenant import Scope

        self.token_status = 200
        self.user_id = MODAL_USER_ID
        self.scope = Scope(MODAL_TENANT_A, MODAL_USER_ID)
        self.resolve_error: Exception | None = None
        self.network_error: Exception | None = None

    def httpx_get(self):
        async def _get(url, *args, **kwargs):
            if self.network_error is not None:
                raise self.network_error
            if self.token_status != 200:
                return SimpleNamespace(status_code=self.token_status, json=lambda: {})
            return SimpleNamespace(
                status_code=200, json=lambda: {"id": self.user_id}
            )

        return AsyncMock(side_effect=_get)

    def resolver(self):
        def _resolve(user_id: str):
            if self.resolve_error is not None:
                raise self.resolve_error
            return self.scope

        return _resolve


@pytest.fixture
def auth_state() -> _AuthState:
    return _AuthState()


@pytest.fixture(params=["modal", "cloud"])
def modal_app(auth_state: _AuthState, request):
    """App instance built in modal mode with all auth backends mocked."""
    from app.core.config import get_settings

    settings = get_settings()
    previous_mode = settings.mindmesh_execution_mode
    settings.mindmesh_execution_mode = request.param
    with (
        patch("httpx.AsyncClient.get", new=auth_state.httpx_get()),
        patch("app.core.cloud_auth.resolve_user", new=auth_state.resolver()),
        # Cloud state and vectors are out of scope here: return empty defaults.
        patch(
            "app.services.cloud_db.load",
            new=lambda kind, default: default,
        ),
        patch(
            "app.services.vectorstore.get_client",
            side_effect=ConnectionError("no qdrant in unit tests"),
        ),
    ):
        from app.main import create_app

        app = create_app()
        yield app
    settings.mindmesh_execution_mode = previous_mode


@pytest.fixture
def modal_client(modal_app):
    return TestClient(modal_app)
