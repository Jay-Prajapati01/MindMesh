"""Private Supabase Storage objects; all paths are owned by the current tenant."""
from urllib.parse import quote
import mimetypes
import httpx
from app.core.config import get_settings
from app.core.tenant import scope


def key(relative: str) -> str:
    parts = relative.split("/")
    if not relative or any(p in ("", ".", "..") for p in parts) or "\\" in relative or ":" in relative:
        raise ValueError("Invalid storage object")
    return f"{scope().tenant_id}/{relative}"


def request(method: str, operation: str, relative: str, **kwargs):
    cfg = get_settings()
    path = quote(key(relative), safe="/")
    headers = {"Authorization": f"Bearer {cfg.supabase_service_role_key}",
               "apikey": cfg.supabase_service_role_key, "x-upsert": "true"}
    if "content" in kwargs:
        headers["Content-Type"] = mimetypes.guess_type(relative)[0] or "application/octet-stream"
    with httpx.Client(timeout=120) as client:
        response = client.request(method,
            f"{cfg.supabase_url}/storage/v1/{operation}/{cfg.supabase_storage_bucket}/{path}",
            headers=headers, **kwargs)
        response.raise_for_status()
        return response


def put(relative: str, data: bytes) -> str:
    request("POST", "object", relative, content=data)
    return relative


def get(relative: str) -> bytes:
    cfg = get_settings()
    path = quote(key(relative), safe="/")
    with httpx.stream("GET", f"{cfg.supabase_url}/storage/v1/object/{cfg.supabase_storage_bucket}/{path}",
                     headers={"Authorization": f"Bearer {cfg.supabase_service_role_key}"}, timeout=120) as response:
        response.raise_for_status()
        data = bytearray()
        for chunk in response.iter_bytes():
            data.extend(chunk)
            if len(data) > cfg.max_upload_size:
                raise ValueError("Stored file exceeds processing limit")
        return bytes(data)


def delete(relative: str) -> bool:
    cfg = get_settings()
    with httpx.Client(timeout=30) as client:
        response = client.request(
                "DELETE", f"{cfg.supabase_url}/storage/v1/object/{cfg.supabase_storage_bucket}",
                headers={"Authorization": f"Bearer {cfg.supabase_service_role_key}"},
                json={"prefixes": [key(relative)]})
        response.raise_for_status()
    return True


def signed_url(relative: str) -> str:
    cfg = get_settings()
    response = request("POST", "object/sign", relative, json={"expiresIn": 60})
    return cfg.supabase_url + "/storage/v1" + response.json()["signedURL"]
