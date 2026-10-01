"""MindMesh FastAPI application entrypoint."""
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


# --- Rate Limiting Middleware ---
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_WINDOW = 60  # seconds
_RATE_LIMIT_MAX_REQUESTS = 60  # per window


class RateLimitMiddleware:
    # Liveness/readiness probes must never be throttled, or an orchestrator
    # will kill a healthy container under load. Matched against the full path
    # (/api/health, /docs, /openapi.json, /redoc).
    def __init__(self, app, max_requests: int = 60, window: int = 60, skip_prefixes: tuple[str, ...] = ()):
        self.app = app
        self.max_requests = max_requests
        self.window = window
        self.skip_prefixes = skip_prefixes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if any(path == p or path.startswith(p) for p in self.skip_prefixes):
            return await self.app(scope, receive, send)

        request = Request(scope, receive)
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean old entries
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.app_name, __version__)
    try:
        vectorstore.ensure_collection()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Qdrant not ready at startup: %s", exc)
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="AI Personal Knowledge Operating System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Add rate limiting in production
if settings.environment == "production":
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=60,
        window=60,
        skip_prefixes=(
            f"{settings.api_prefix}/health",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        ),
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
