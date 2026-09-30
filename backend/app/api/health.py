"""Health check endpoint."""
import httpx
from fastapi import APIRouter

from app import __version__
from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.schemas import HealthResponse

logger = get_logger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        environment=settings.environment,
        version=__version__,
    )


@router.get("/health/detailed")
async def health_detailed():
    """Detailed health check including service dependencies."""
    settings = get_settings()
    checks = {"app": "ok", "ollama": "unknown", "qdrant": "unknown"}
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(base_url=settings.ollama_url, timeout=5) as client:
            resp = await client.get("/api/tags")
            if resp.status_code == 200:
                checks["ollama"] = "ok"
            else:
                checks["ollama"] = f"error: status {resp.status_code}"
    except Exception as e:
        checks["ollama"] = f"error: {str(e)[:100]}"
    
    # Check Qdrant
    try:
        from app.services.vectorstore import get_client
        client = get_client()
        collections = client.get_collections()
        checks["qdrant"] = "ok"
    except Exception as e:
        checks["qdrant"] = f"error: {str(e)[:100]}"
    
    overall_status = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    
    return {
        "status": overall_status,
        "app": settings.app_name,
        "environment": settings.environment,
        "version": __version__,
        "llm_model": settings.llm_model,
        "embedding_model": settings.embedding_model,
        "collection": settings.qdrant_collection,
        "checks": checks,
    }
