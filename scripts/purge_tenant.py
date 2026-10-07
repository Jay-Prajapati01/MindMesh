"""Auditable tenant deletion cascade (audit P1-8).

Removes ONE tenant's data across Supabase Postgres, Supabase Storage,
Qdrant and Redis, and prints a JSON audit summary of what was deleted.
Nothing runs without --dry-run or --yes.

Run from repository root after configuring deploy/.env.modal:

  python scripts/purge_tenant.py --tenant-id <uuid> --dry-run
  python scripts/purge_tenant.py --tenant-id <uuid> --yes | tee purge-<uuid>.json

Covers: mm_state, mm_job_results, normalized mm_* tables (when the P0-5
migration has been applied), memberships, storage objects under the tenant
prefix, Qdrant points in every collection, job records/queue/DLQ entries,
quota counters and resource locks. Modal scratch data is already covered by
storage_maintenance.cleanup_staging(). The tenant row itself is kept unless
--drop-tenant is given.
"""
import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

QUEUE = "mindmesh:jobs:due"
DLQ = "mindmesh:jobs:dlq"

# Child tables first; ON DELETE CASCADE covers mm_messages via conversations.
PG_TABLES = [
    "mm_state",
    "mm_job_results",
    "mm_sources",
    "mm_notes",
    "mm_messages",
    "mm_conversations",
    "mm_graph_edges",
    "mm_graph_nodes",
    "mm_memberships",
]


def _ok(report: dict, step: str, deleted: int, note: str = "") -> None:
    report[step] = {"deleted": deleted, "error": None, **({"note": note} if note else {})}


def _fail(report: dict, step: str, exc: Exception) -> None:
    report[step] = {"deleted": None, "error": f"{type(exc).__name__}: {exc}"}


def purge_postgres(cfg, tenant: str, dry: bool, drop_tenant: bool) -> dict:
    import psycopg
    report: dict = {}
    try:
        conn = psycopg.connect(cfg.supabase_db_url, connect_timeout=10)
    except Exception as exc:  # noqa: BLE001 - reported per step
        _fail(report, "postgres", exc)
        return report
    total = 0
    try:
        with conn.transaction():
            existing = {row[0] for row in conn.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' AND table_name LIKE 'mm_%'").fetchall()}
            for table in PG_TABLES:
                if table not in existing:
                    continue
                if table == "mm_messages":
                    cur = conn.execute(
                        "DELETE FROM public.mm_messages WHERE conversation_id IN "
                        "(SELECT conversation_id FROM public.mm_conversations WHERE tenant_id=%s)",
                        (tenant,))
                else:
                    cur = conn.execute(
                        f"DELETE FROM public.{table} WHERE tenant_id=%s", (tenant,))
                total += cur.rowcount or 0
            if drop_tenant:
                cur = conn.execute("DELETE FROM public.mm_tenants WHERE id=%s", (tenant,))
                total += cur.rowcount or 0
            if dry:
                conn.rollback()
        _ok(report, "postgres", total,
            "rolled back (dry-run)" if dry else
            ("tenant row dropped" if drop_tenant else "tenant row kept"))
    except Exception as exc:  # noqa: BLE001
        _fail(report, "postgres", exc)
    finally:
        conn.close()
    return report


def purge_storage(cfg, tenant: str, dry: bool) -> dict:
    import httpx
    report: dict = {}
    headers = {"Authorization": f"Bearer {cfg.supabase_service_role_key}"}
    base = f"{cfg.supabase_url}/storage/v1"
    names: list[str] = []
    try:
        with httpx.Client(timeout=60) as client:
            offset = 0
            while True:
                resp = client.post(f"{base}/object/list/{cfg.supabase_storage_bucket}",
                                   headers=headers,
                                   json={"prefix": tenant + "/", "limit": 1000, "offset": offset})
                resp.raise_for_status()
                page = resp.json()
                if isinstance(page, dict):  # API error envelope
                    raise RuntimeError(page.get("message", str(page)))
                names.extend(e["name"] for e in page if "name" in e)
                if len(page) < 1000:
                    break
                offset += len(page)
            if names and not dry:
                # Prefix delete removes every object under the tenant root.
                resp = client.request("DELETE", f"{base}/object/{cfg.supabase_storage_bucket}",
                                      headers=headers, json={"prefixes": [tenant + "/"]})
                resp.raise_for_status()
        _ok(report, "storage", len(names),
            "listed only (dry-run)" if dry else f"prefix {tenant}/ removed")
    except Exception as exc:  # noqa: BLE001
        _fail(report, "storage", exc)
    return report


def purge_qdrant(cfg, tenant: str, dry: bool) -> dict:
    from qdrant_client import QdrantClient, models
    report: dict = {}
    total = 0
    try:
        client = QdrantClient(url=cfg.qdrant_url, api_key=cfg.qdrant_api_key or None, timeout=30)
        flt = models.Filter(must=[models.FieldCondition(
            key="tenant_id", match=models.MatchValue(value=tenant))])
        for coll in client.get_collections().collections:
            count = client.count(coll.name, count_filter=flt, exact=True).count
            total += count
            if count and not dry:
                client.delete(coll.name, points_selector=flt, wait=True)
        _ok(report, "qdrant", total,
            "counted only (dry-run)" if dry else "across all collections")
    except Exception as exc:  # noqa: BLE001
        _fail(report, "qdrant", exc)
    return report


def purge_redis(cfg, tenant: str, dry: bool) -> dict:
    import redis as redis_lib
    report: dict = {}
    deleted = {"jobs": 0, "queue_refs": 0, "quota": 0, "locks": 0}
    try:
        r = redis_lib.from_url(cfg.redis_url, decode_responses=True,
                               socket_timeout=15, socket_connect_timeout=10)
        job_keys: list[tuple[str, str]] = []
        for k in r.scan_iter("mindmesh:job:*"):
            data = r.get(k)
            if not data:
                continue
            try:
                job = json.loads(data)
            except json.JSONDecodeError:
                continue
            if job.get("tenant_id") == tenant:
                job_keys.append((k, job.get("job_id", "")))
        quota_keys = list(r.scan_iter(f"mm:quota:*:{tenant}:*"))
        lock_keys = list(r.scan_iter(f"mindmesh:resource:{tenant}:*"))
        if dry:
            deleted = {"jobs": len(job_keys), "queue_refs": len(job_keys),
                       "quota": len(quota_keys), "locks": len(lock_keys)}
        else:
            for i in range(0, len(job_keys), 200):
                batch = job_keys[i:i + 200]
                with r.pipeline() as pipe:
                    for job_key, job_id in batch:
                        pipe.delete(job_key)
                        pipe.zrem(QUEUE, job_id)
                        pipe.zrem(DLQ, job_id)
                    pipe.execute()
                deleted["jobs"] += len(batch)
                deleted["queue_refs"] += len(batch)
            for keys, bucket in ((quota_keys, "quota"), (lock_keys, "locks")):
                for i in range(0, len(keys), 500):
                    r.delete(*keys[i:i + 500])
                    deleted[bucket] += min(500, len(keys) - i)
        _ok(report, "redis", sum(deleted.values()), json.dumps(deleted))
    except Exception as exc:  # noqa: BLE001
        _fail(report, "redis", exc)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant-id", required=True, help="tenant UUID to purge")
    parser.add_argument("--dry-run", action="store_true", help="count only; write nothing")
    parser.add_argument("--yes", action="store_true", help="confirm destructive run")
    parser.add_argument("--drop-tenant", action="store_true",
                        help="also delete the mm_tenants row (cascades memberships)")
    args = parser.parse_args()

    if not args.dry_run and not args.yes:
        raise SystemExit("Refusing destructive run without --yes (or use --dry-run)")

    from dotenv import load_dotenv
    load_dotenv(ROOT / "deploy/.env.modal", override=True)
    from app.core.config import get_settings

    cfg = get_settings()
    missing = [name for name, value in (
        ("supabase_db_url", cfg.supabase_db_url),
        ("supabase_url", cfg.supabase_url),
        ("supabase_service_role_key", cfg.supabase_service_role_key),
        ("qdrant_url", cfg.qdrant_url),
        ("redis_url", cfg.redis_url),
    ) if not value]
    if missing:
        raise SystemExit("Missing configuration: " + ", ".join(missing))

    started = time.time()
    audit = {
        "tenant_id": args.tenant_id,
        "mode": "dry-run" if args.dry_run else "delete",
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "steps": {},
    }
    audit["steps"].update(purge_postgres(cfg, args.tenant_id, args.dry_run, args.drop_tenant))
    audit["steps"].update(purge_storage(cfg, args.tenant_id, args.dry_run))
    audit["steps"].update(purge_qdrant(cfg, args.tenant_id, args.dry_run))
    audit["steps"].update(purge_redis(cfg, args.tenant_id, args.dry_run))
    audit["duration_seconds"] = round(time.time() - started, 2)

    print(json.dumps(audit, indent=2))
    failed = [k for k, v in audit["steps"].items() if v.get("error")]
    if failed:
        print(f"INCOMPLETE: steps failed: {', '.join(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
