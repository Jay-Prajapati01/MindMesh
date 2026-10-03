"""MindMesh FastAPI application entrypoint."""
import asyncio
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api import (
    audio,
    chat,
    compare,
    documents,
    graph,
    health,
    instagram,
    notes,
    pdf,
    search,
    sources,
    stats,
    timeline,
    videos,
    web,
)
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.core.security import require_key
from app.services import vectorstore

configure_logging()
logger = get_logger(__name__)
settings = get_settings()


# --- Rate Limiting Middleware (on in every environment; see settings) ---
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_last_sweep = 0.0


class RateLimitMiddleware:
    # Liveness/readiness probes must never be throttled, or an orchestrator
    # will kill a healthy container under load. Matched against the full path
    # (/api/health, /docs, /openapi.json, /redoc).
    def __init__(self, app, max_requests: int = 120, window: int = 60, skip_prefixes: tuple[str, ...] = ()):
        self.app = app
        self.max_requests = max_requests
        self.window = window
        self.skip_prefixes = skip_prefixes

    def _client_ip(self, request: Request) -> str:
        if settings.trust_proxy:
            forwarded = request.headers.get("x-forwarded-for", "")
            if forwarded:
                # First hop is the original client when set by our proxy.
                return forwarded.split(",")[0].strip() or "unknown"
        return request.client.host if request.client else "unknown"

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if any(path == p or path.startswith(p) for p in self.skip_prefixes):
            return await self.app(scope, receive, send)

        request = Request(scope, receive)
        client_ip = self._client_ip(request)
        now = time.time()

        global _last_sweep
        # Periodically evict idle IPs so the store cannot grow unbounded.
        if now - _last_sweep >= self.window:
            _last_sweep = now
            for ip in [k for k, ts in _rate_limit_store.items() if not ts or now - ts[-1] >= self.window]:
                _rate_limit_store.pop(ip, None)

        _rate_limit_store[client_ip] = [
            t for t in _rate_limit_store[client_ip] if now - t < self.window
        ]

        if len(_rate_limit_store[client_ip]) >= self.max_requests:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please try again later."},
            )
            return await response(scope, receive, send)

        _rate_limit_store[client_ip].append(now)
        return await self.app(scope, receive, send)


# --- Request body size limits (checked BEFORE FastAPI/Starlette parse) ---
class _BodyTooLarge(Exception):
    """Raised from the guarded receive() when a streamed body exceeds the cap."""


class BodySizeLimitMiddleware:
    """Reject oversized request bodies before they are buffered/spooled.

    Content-Length is checked up-front; chunked bodies are counted as they
    stream and aborted at the cap.
    """

    def __init__(self, app, json_limit: int, multipart_limit: int):
        self.app = app
        self.json_limit = json_limit
        self.multipart_limit = multipart_limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") in ("GET", "HEAD", "OPTIONS"):
            return await self.app(scope, receive, send)

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        content_type = headers.get("content-type", "")
        limit = self.multipart_limit if content_type.startswith("multipart/form-data") else self.json_limit

        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > limit:
                    response = JSONResponse(
                        status_code=413,
                        content={"detail": f"Request body too large (max {limit} bytes)"},
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        received = 0

        async def guarded_receive():
            nonlocal received
            message = await receive()
            if message.get("type") == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise _BodyTooLarge()
            return message

        try:
            await self.app(scope, guarded_receive, send)
        except _BodyTooLarge:
            response = JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large (max {limit} bytes)"},
            )
            try:
                await response(scope, receive, send)
            except Exception:  # noqa: BLE001 — response may already be streaming
                logger.warning("Could not deliver 413 for oversized body on %s", path)


# --- Concurrency limiter for heavy ingestion pipelines (M-9) ---
_heavy_semaphore: asyncio.Semaphore | None = None


class HeavyTaskMiddleware:
    """Limit concurrent heavy ingestion tasks (audio, PDF, video, web, Instagram)."""

    HEAVY_PREFIXES = ("/api/audio", "/api/pdf", "/api/videos", "/api/instagram", "/api/documents", "/api/web")

    def __init__(self, app, max_tasks: int = 2):
        global _heavy_semaphore
        self.app = app
        _heavy_semaphore = asyncio.Semaphore(max_tasks)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if not path.startswith(self.HEAVY_PREFIXES):
            return await self.app(scope, receive, send)

        async with _heavy_semaphore:
            return await self.app(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.app_name, __version__)
    if _is_production and not settings.api_key:
        logger.error(
            "ENVIRONMENT=production but API_KEY is empty — all mutating "
            "endpoints will return 503 until a key is configured."
        )
    try:
        vectorstore.ensure_collection()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Qdrant not ready at startup: %s", exc)
    yield
    logger.info("Shutting down %s", settings.app_name)


_is_production = settings.environment == "production"

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="AI Personal Knowledge Operating System",
    lifespan=lifespan,
    # /docs + /openapi.json expose the full API surface: keep them out of
    # production deployments (I-1).
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# Concurrency limiter for heavy ingestion pipelines (M-9) — innermost.
app.add_middleware(
    HeavyTaskMiddleware,
    max_tasks=settings.max_concurrent_heavy_tasks,
)

# Oversized-body rejection must run before routing/parsing.
app.add_middleware(
    BodySizeLimitMiddleware,
    json_limit=settings.max_json_body_size,
    multipart_limit=settings.max_multipart_body_size,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Rate limiting is on by default in every environment (was production-only).
if settings.rate_limit_enabled:
    _skip = [f"{settings.api_prefix}/health", "/health"]
    if not _is_production:
        _skip += ["/docs", "/redoc", "/openapi.json"]
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.rate_limit_max_requests,
        window=settings.rate_limit_window,
        skip_prefixes=tuple(_skip),
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Map domain ValueErrors (e.g. empty content) to a 400 response.

    Routers already convert their own ValueErrors to HTTPException(400);
    this catches any that escape. Request schema problems remain 422 via
    FastAPI's RequestValidationError handler.
    """
    return JSONResponse(status_code=400, content={"detail": str(exc)})

# Mutating routers require an X-API-Key header in production (see core.security).
_mutating = [Depends(require_key)]
app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(videos.router, prefix=settings.api_prefix, dependencies=_mutating)
app.include_router(instagram.router, prefix=settings.api_prefix, dependencies=_mutating)
app.include_router(pdf.router, prefix=settings.api_prefix, dependencies=_mutating)
app.include_router(documents.router, prefix=settings.api_prefix, dependencies=_mutating)
app.include_router(audio.router, prefix=settings.api_prefix, dependencies=_mutating)
app.include_router(web.router, prefix=settings.api_prefix, dependencies=_mutating)
app.include_router(graph.router, prefix=settings.api_prefix)
app.include_router(timeline.router, prefix=settings.api_prefix)
app.include_router(compare.router, prefix=settings.api_prefix)
app.include_router(notes.router, prefix=settings.api_prefix)
app.include_router(search.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(stats.router, prefix=settings.api_prefix)
app.include_router(sources.router, prefix=settings.api_prefix)


@app.get("/")
async def root() -> dict:
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }


@app.get("/health")
async def health_alias():
    """Bare /health alias for probes that do not use the /api prefix."""
    return await health.health()
