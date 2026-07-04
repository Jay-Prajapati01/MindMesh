"""MindMesh FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
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
from app.services import vectorstore

configure_logging()
logger = get_logger(__name__)
settings = get_settings()


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
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Map domain ValueErrors (e.g. empty content) to a 422 response."""
    return JSONResponse(status_code=422, content={"detail": str(exc)})

app.include_router(health.router)
app.include_router(videos.router, prefix=settings.api_prefix)
app.include_router(instagram.router, prefix=settings.api_prefix)
app.include_router(pdf.router, prefix=settings.api_prefix)
app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(audio.router, prefix=settings.api_prefix)
app.include_router(web.router, prefix=settings.api_prefix)
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
    return {"app": settings.app_name, "docs": "/docs", "health": "/health"}
