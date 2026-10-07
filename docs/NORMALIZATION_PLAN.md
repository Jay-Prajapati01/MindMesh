# Normalization cutover plan (audit P0-5)

Status: **stage 1 done** — `supabase/migrations/202610070001_normalized_state.sql`
creates the target tables, constraints, indexes and RLS. The application still
reads and writes the JSON documents in `mm_state`. This document is the
remaining cutover runbook.

## Why

`mm_state` stores sources, notes, conversations and the knowledge graph as
JSON blobs keyed by `(tenant_id, kind)`. Every read loads the whole document;
every write rewrites it under a `StoreLock`; there are no primary keys,
foreign keys, uniqueness constraints or per-tenant indexes at the row level.
This does not scale, cannot be partially updated safely, and makes deletion
cascades and retention audits a code-level concern instead of a database one.

## Target state

| Was (mm_state JSON key) | Is (table) | Key constraints |
|---|---|---|
| `sources` array | `mm_sources` | PK `(tenant_id, source_id)`, FK tenant, unique live URL per tenant, soft delete |
| `notes` array | `mm_notes` | PK `(tenant_id, note_id)`, title length check, soft delete |
| `conversations` array | `mm_conversations` + `mm_messages` | FK cascade per message, per-user index, role check |
| `graph` = `{nodes, edges}` | `mm_graph_nodes` + `mm_graph_edges` | PKs incl. edge provenance `source_id`, FK tenant |
| (job results mirror) | `mm_job_results` | retention indexes added in stage 1 |

RLS: enabled on all six new tables; `anon`/`authenticated` revoked, only
`service_role` granted — same posture as the existing `mm_*` tables (browser
never touches Postgres directly).

## Cutover steps (stage 2+ — NOT run yet)

Run against staging first, one tenant at a time, before any production row.

1. **Backfill** (idempotent, per tenant):
   ```sql
   insert into public.mm_sources (source_id, tenant_id, user_id, source_type,
       title, url, file_path, file_name, file_size, mime_type, summary,
       key_topics, chunks_indexed, page_count, created_at)
   select s->>'source_id', s.tenant_id, (s->>'user_id')::uuid,
       coalesce(s->>'source_type','web'), coalesce(s->>'title',''),
       s->>'url', s->>'file_path', s->>'file_name',
       (s->>'file_size')::bigint, s->>'mime_type', s->>'summary',
       coalesce(s->'key_topics','[]')::jsonb,
       coalesce((s->>'chunks_indexed')::int,0),
       (s->>'page_count')::int, coalesce((s->>'created_at')::timestamptz, now())
   from public.mm_state t
   cross join jsonb_array_elements(t.body->'sources') s
   where t.kind='sources'
     and not exists (select 1 from public.mm_sources m
                     where m.tenant_id=t.tenant_id
                       and m.source_id=s->>'source_id')
   on conflict do nothing;
   ```
   Repeat for `notes`, `conversations` (+ `messages`), `graph` (nodes/edges).
2. **Verify counts** per tenant: row counts vs `jsonb_array_length` of the
   JSON document; abort on mismatch. Record `tenant_id, kind, json_count,
   table_count, ok` in the migration log.
3. **Dual-write**: put the six tables and the JSON documents behind one flag
   (`settings.normalize_state`, default off). Writes go to both; reads come
   from the tables when the flag is on. Ship one release with this.
4. **Compare** for a release cycle: nightly query reports JSON-vs-table drift
   per tenant. Zero drift for N consecutive days before switching reads.
5. **Flip reads**, keep dual-write one more release, then stop JSON writes.
6. **Drop** the `sources`/`notes`/`conversations`/`graph` keys from `mm_state`
   (keep the table for bounded metadata only). Vacuum.
7. **Vectors stay separate**: reindex into the BGE-M3 collection with
   `scripts/migrate_cloud.py`. 768-dim Nomic points are quarantined in their
   own collection and are never queried alongside 1,024-dim BGE-M3
   (enforced by `vectorstore.ensure_collection` dimension/model checks).

## Rollback

While dual-write is active: flip the flag off; JSON is authoritative and
untouched. After JSON writes stop: restore from the pre-cutover snapshot
(the backfill is deterministic and can be re-run from a restored `mm_state`).

## Completion criteria

- [x] Tables, FKs, checks, indexes, RLS exist (stage 1 migration).
- [ ] Backfill script executed and count-verified on staging.
- [ ] Dual-write flag wired through `app/services/store.py` and `graph.py`.
- [ ] Drift report clean for one release cycle.
- [ ] Reads flipped; `mm_state` JSON keys dropped.
- [ ] Restore drill from snapshot reproduces counts (audit P0-11).
