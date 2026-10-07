"""Cloud facade: authenticate, validate, stage inputs, queue, and report status."""
import asyncio
import hashlib
import importlib
import json
import time
from pathlib import PurePath
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import ValidationError
from app.core import metrics
from app.core.config import get_settings
from app.core.filesignature import FileSignatureError, validate_signature
from app.core.logging import get_logger
from app.core.ratelimit import quota_hit
from app.core.uploads import read_upload
from app.core.tenant import scope
from app.services import jobs, cloud_storage
from app.services.job_runner import HANDLERS
from app.services.sse import sse

logger = get_logger(__name__)
router = APIRouter()
_upload_slots = asyncio.Semaphore(get_settings().max_concurrent_heavy_tasks)


async def stage_file(kind: str, request: Request) -> tuple[dict, str]:
    async with request.form() as form:
        file = form.get("file")
        if file is None or not getattr(file, "filename", None):
            raise HTTPException(400, "File required")
        filename = PurePath(file.filename.replace("\\", "/")).name
        data = await read_upload(file)
    if not data:
        raise HTTPException(400, "Empty file")
    suffix = PurePath(filename).suffix.lower()
    allowed = {"pdf": {".pdf"}, "documents": {".docx", ".pptx", ".xlsx", ".csv", ".txt", ".md", ".markdown"},
               "audio": {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"}}
    if suffix not in allowed[kind]:
        raise HTTPException(400, "Unsupported file format")
    # Content must match the extension before anything is staged (audit P0-10).
    try:
        validate_signature(filename, data)
    except FileSignatureError as exc:
        metrics.inc("upload_rejected_total", reason="signature")
        raise HTTPException(400, str(exc)) from None
    # Per-tenant daily upload quota (audit P0-9): reject BEFORE storing bytes.
    settings = get_settings()
    allowed_quota, used = quota_hit(
        scope().tenant_id, "upload_bytes", len(data), settings.max_upload_bytes_per_tenant_per_day)
    if not allowed_quota:
        metrics.inc("quota_rejected_total", kind="upload_bytes")
        raise HTTPException(429, "Daily upload quota reached",
                            headers={"Retry-After": "3600"})
    resource = hashlib.sha256(data).hexdigest()
    path = f"inputs/{resource}{suffix}"
    await asyncio.to_thread(cloud_storage.put, path, data)
    payload = {"object": path, "filename": filename}
    return payload, resource


async def enqueue(kind: str, request: Request):
    module, _, schema = HANDLERS[kind]
    staged_object: str | None = None
    if schema is None:
        async with _upload_slots:
            payload, resource = await stage_file(kind, request)
            staged_object = payload.get("object")
    else:
        api = importlib.import_module("app.api." + module)
        try:
            payload = getattr(api, schema).model_validate(await request.json()).model_dump(mode="json")
        except (ValidationError, ValueError):
            raise HTTPException(422, "Invalid request") from None
        if kind == "chat" and payload.get("conversation_id"):
            # Serialize concurrent turns to the same conversation.
            resource = "conversation:" + payload["conversation_id"]
        else:
            resource = hashlib.sha256(json.dumps([kind, payload], sort_keys=True).encode()).hexdigest()
        # Schemas discard extra fields; tenant/user IDs are never copied into the envelope.
    idempotency = request.headers.get("Idempotency-Key", "")
    if len(idempotency) > 128:
        raise HTTPException(400, "Idempotency key too long")
    try:
        return await asyncio.to_thread(jobs.create, kind, payload, resource, idempotency)
    except jobs.QuotaExceeded as exc:
        raise HTTPException(429, str(exc), headers={"Retry-After": "86400"}) from None
    except Exception:
        # Never leave an orphaned staged object behind when enqueue fails.
        if staged_object:
            try:
                await asyncio.to_thread(cloud_storage.delete, staged_object)
            except Exception as cleanup_exc:  # noqa: BLE001
                logger.warning("staged object cleanup failed object=%s err=%s", staged_object, cleanup_exc)
        raise


def endpoint(kind: str, stream: bool):
    async def submit(request: Request):
        job = await enqueue(kind, request)
        if not stream:
            return JSONResponse(jobs.public(job), status_code=202, headers={"Location": f"{get_settings().api_prefix}/jobs/{job['job_id']}"})

        async def events():
            yield sse("queued", jobs.public(job))
            yield sse("step_start", {"step": 1, "total_steps": 1, "name": "Cloud processing"})
            deadline = time.monotonic() + get_settings().sse_max_wait_seconds
            while True:
                if time.monotonic() > deadline:
                    # Honest terminal state instead of an infinite spinner.
                    metrics.inc("sse_deadline_exceeded_total")
                    yield sse("error", {"error": "Processing is taking longer than expected. "
                                                 "Check the job status page for the final result.",
                                        "job_id": job["job_id"]})
                    return
                try:
                    latest = await asyncio.to_thread(jobs.owned, job["job_id"])
                except KeyError:
                    yield sse("error", {"error": "Job no longer exists", "job_id": job["job_id"]})
                    return
                if latest["status"] in jobs.TERMINAL:
                    if latest["status"] == "completed":
                        result = latest["result"]
                        if kind == "chat":
                            yield f"data: {json.dumps({'type': 'token', 'content': result['answer']})}\n\n"
                            yield f"data: {json.dumps({'type': 'done', **result})}\n\n"
                        else:
                            yield sse("step_complete", {"step": 1})
                            yield sse("complete", result)
                    else:
                        message = (latest.get("error") or {}).get("message", "Job cancelled")
                        yield sse("error", {"error": message, "job_id": job["job_id"]})
                    return
                yield ": waiting\n\n"
                await asyncio.sleep(2)
        return StreamingResponse(events(), media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "X-Job-ID": job["job_id"]})
    return submit


for _kind in HANDLERS:
    _base = f"/{_kind}" + ("/process" if _kind in {"pdf", "documents", "audio", "videos", "web", "instagram"} else "")
    router.add_api_route(_base, endpoint(_kind, False), methods=["POST"], name=f"queue_{_kind}")
    if _kind not in {"search", "compare"}:
        router.add_api_route(_base + "/stream", endpoint(_kind, True), methods=["POST"], name=f"stream_{_kind}")


@router.get("/jobs/{job_id}")
async def status(job_id: str):
    try:
        return jobs.public(await asyncio.to_thread(jobs.owned, job_id))
    except (KeyError, ValueError):
        raise HTTPException(404, "Job not found") from None


@router.delete("/jobs/{job_id}")
async def cancel(job_id: str):
    try:
        return jobs.public(await asyncio.to_thread(jobs.cancel, job_id))
    except KeyError:
        raise HTTPException(404, "Job not found") from None
    except ValueError:
        raise HTTPException(409, "Only queued jobs can be cancelled") from None
