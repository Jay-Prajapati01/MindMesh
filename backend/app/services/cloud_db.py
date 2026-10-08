"""Supabase Postgres persistence, serialized per tenant for legacy store operations."""
from contextlib import contextmanager
from contextvars import ContextVar
import threading
import psycopg
from psycopg.types.json import Jsonb
from app.core.config import get_settings
from app.core.tenant import cloud, scope

_connection = ContextVar("store_connection", default=None)


@contextmanager
def connect():
    existing = _connection.get()
    if existing is not None:
        yield existing
    else:
        with psycopg.connect(get_settings().supabase_db_url, connect_timeout=10) as conn:
            conn.execute("SET LOCAL statement_timeout = '30s'")
            yield conn


def member(tenant_id: str, user_id: str) -> bool:
    with connect() as conn:
        return conn.execute(
            """SELECT 1 FROM public.mm_memberships m
               WHERE m.tenant_id=%s AND m.user_id=%s AND m.active
                 AND NOT EXISTS (
                   SELECT 1 FROM public.mm_memberships other
                   WHERE other.tenant_id=m.tenant_id AND other.user_id<>m.user_id AND other.active
                 )""",
            (tenant_id, user_id),
        ).fetchone() is not None


class StoreLock:
    """Keep local locking; cloud mutations use a database transaction/advisory lock."""
    def __init__(self):
        self.local = threading.Lock()
        self.state = threading.local()

    def __enter__(self):
        if not cloud():
            return self.local.__enter__()
        conn = psycopg.connect(get_settings().supabase_db_url, connect_timeout=10)
        try:
            conn.execute("SET LOCAL statement_timeout = '30s'")
            conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (scope().tenant_id,))
        except BaseException:
            conn.close()
            raise
        self.state.conn = conn
        self.state.token = _connection.set(conn)
        return self

    def __exit__(self, kind, value, traceback):
        if not cloud():
            return self.local.__exit__(kind, value, traceback)
        conn = self.state.conn
        try:
            conn.rollback() if kind else conn.commit()
        finally:
            _connection.reset(self.state.token)
            conn.close()


def load(kind: str, default: dict) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT body FROM public.mm_state WHERE tenant_id=%s AND kind=%s",
                           (scope().tenant_id, kind)).fetchone()
        return row[0] if row else default


def save(kind: str, data: dict) -> None:
    if _connection.get() is None:
        raise RuntimeError("Cloud state writes require a transaction")
    with connect() as conn:
        conn.execute("""INSERT INTO public.mm_state(tenant_id,kind,body) VALUES (%s,%s,%s)
                     ON CONFLICT(tenant_id,kind) DO UPDATE SET body=excluded.body""",
                     (scope().tenant_id, kind, Jsonb(data)))


def save_result(job: dict) -> None:
    owner = scope()
    with connect() as conn:
        conn.execute("""INSERT INTO public.mm_job_results(job_id,tenant_id,user_id,resource_id,body)
            VALUES (%s,%s,%s,%s,%s) ON CONFLICT(job_id) DO UPDATE SET body=excluded.body
            WHERE mm_job_results.tenant_id=excluded.tenant_id AND mm_job_results.user_id=excluded.user_id""",
            (owner.job_id, owner.tenant_id, owner.user_id, owner.resource_id, Jsonb(job)))
