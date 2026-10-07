"""Explicit operator migration: re-ingest originals into a new tenant-scoped collection.

Run from repository root after configuring deploy/.env.modal. Does not copy old vectors.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--user-id", required=True)
    args = parser.parse_args()
    from dotenv import load_dotenv
    load_dotenv(ROOT / "deploy/.env.modal", override=True)
    from app.core.tenant import Scope, current_scope
    from app.services import cloud_db, cloud_storage, jobs
    if not cloud_db.member(args.tenant_id, args.user_id):
        raise SystemExit("Active tenant membership required")
    token = current_scope.set(Scope(args.tenant_id, args.user_id))
    try:
        base = args.data_dir.resolve(strict=True)
        state = json.loads((base / "store.json").read_text(encoding="utf-8"))
        for item in state.get("sources", []):
            kind = {"youtube": "videos", "document": "documents"}.get(item["source_type"], item["source_type"])
            if kind in {"pdf", "documents", "audio"}:
                path = (base / item["file_path"]).resolve(strict=True)
                if not path.is_relative_to(base):
                    raise ValueError("Original path escapes data directory")
                data = path.read_bytes()
                if len(data) > 200 * 1024 * 1024:
                    raise ValueError("Original exceeds upload limit")
                resource = hashlib.sha256(data).hexdigest()
                object_path = cloud_storage.put(f"inputs/{resource}{path.suffix.lower()}", data)
                payload = {"object": object_path, "filename": item.get("file_name") or path.name}
            elif kind in {"videos", "web", "instagram"}:
                url = item.get("url") or item.get("channel", "")
                if kind == "videos":
                    url = "https://www.youtube.com/watch?v=" + item["source_id"]
                if not url.startswith("https://"):
                    raise ValueError("Original URL missing; repair the source metadata before migration")
                payload = {"url": url}
                resource = hashlib.sha256(url.encode()).hexdigest()
            else:
                continue
            job = jobs.create(kind, payload, resource, "migration-v1:" + item["source_id"])
            print(job["job_id"], job["status"])
        # Notes retain their IDs. Re-running does not duplicate records.
        with cloud_db.StoreLock():
            target = cloud_db.load("store", {"sources": [], "notes": [], "questions": [], "searches": []})
            notes = {n["id"]: n for n in target.get("notes", [])}
            notes.update({n["id"]: n for n in state.get("notes", [])})
            target["notes"] = list(notes.values())
            cloud_db.save("store", target)
    finally:
        current_scope.reset(token)


if __name__ == "__main__":
    main()
