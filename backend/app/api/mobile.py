"""Fast acknowledgement facade for the native companion's shared URLs."""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import get_settings

router = APIRouter(prefix="/mobile", tags=["mobile"])


class QuickSaveRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)


def _kind(url: str) -> str:
    host = url.split("/", 3)[2].lower() if url.startswith(("https://", "http://")) and len(url.split("/", 3)) > 2 else ""
    if host in {"youtu.be", "www.youtu.be", "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}:
        return "videos"
    if host in {"instagram.com", "www.instagram.com", "m.instagram.com"}:
        return "instagram"
    if not host:
        raise HTTPException(422, "A valid http or https URL is required")
    return "web"


@router.post("/quick-saves", status_code=202)
async def quick_save(payload: QuickSaveRequest, request: Request):
    idempotency = request.headers.get("Idempotency-Key", "")
    if not idempotency or len(idempotency) > 128:
        raise HTTPException(400, "A stable Idempotency-Key is required")
    kind = _kind(payload.url)
    if get_settings().mindmesh_execution_mode in {"modal", "cloud"}:
        from app.api.cloud_jobs import enqueue_payload
        job = await enqueue_payload(kind, {"url": payload.url}, idempotency)
        return {"item_id": job["resource_id"], "job_id": job["job_id"], "status": job["status"]}
    from app.services import mobile_saves
    job = mobile_saves.create(kind, payload.url, idempotency)
    if job["status"] == "queued":
        mobile_saves.schedule(job["job_id"])
    return {"item_id": job["job_id"], "job_id": job["job_id"], "status": job["status"]}


@router.get("/quick-saves/{job_id}")
async def quick_save_status(job_id: str):
    if get_settings().mindmesh_execution_mode in {"modal", "cloud"}:
        from app.services import jobs
        try:
            return jobs.public(jobs.owned(job_id))
        except (KeyError, ValueError):
            raise HTTPException(404, "Save not found") from None
    from app.services import mobile_saves
    try:
        job = mobile_saves.owned(job_id)
        if job["status"] == "queued":
            mobile_saves.schedule(job_id)
        return job
    except KeyError:
        raise HTTPException(404, "Save not found") from None
