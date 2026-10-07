# MindMesh Authorization Matrix (audit P0-3)

Owner: backend. Last updated: 7 October 2026.
Verified by: `backend/tests/test_auth_matrix.py` (deny-by-default assertions run in CI).

## Identity model

| Mode | How identity is proven | How tenant is resolved | Client can forge? |
|---|---|---|---|
| modal (cloud) | `Authorization: Bearer <supabase JWT>` validated against `GET {SUPABASE_URL}/auth/v1/user` (`app/core/cloud_auth.py`) | `mm_memberships` row for that user id — exactly one active row or 403 | **No.** Tenant/user never read from path, query, header or body. `Scope` is a server-side ContextVar (`app/core/tenant.py`). |
| local (dev) | Optional `X-API-Key` when `API_KEY` is configured (`app/core/security.py`); open when unset | Single-user; Qdrant ownership filter disabled by design | N/A (development only; production forces modal mode — `app/core/config.py`) |

## Tenant policy (audit P0-6) — decided

**A tenant is a shared workspace.** Sources, notes, graph, stats, timeline and
vector points are visible to every *active member* of the tenant.
**Conversations and jobs are scoped to the individual user** (chat history is
private even inside a shared workspace; jobs can only be read/cancelled by
their creator). Membership revocation removes all access on the very next
request (no membership caching).

## Deny-by-default matrix

Legend: **A** = active Supabase bearer + active membership required;
**K** = `X-API-Key` (local, only when `API_KEY` set);
**scope** = tenant scope re-asserted server-side; **—** = not applicable.

### Public (no auth, in every mode)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/health` | none | Liveness only: app/version. No dependency detail. |
| GET | `/api/health` | none | Same as above. |
| GET | `/api/health/detailed` | none | Readiness: `ok/error` booleans only — no URLs, credentials or hostnames. |
| OPTIONS | `*` | none | CORS preflight. |

### Cloud (modal) — job facade

| Method | Path | Guard | Ownership check |
|---|---|---|---|
| POST | `/api/{videos,instagram,web,pdf,documents,audio}/process` | A + scope | Envelope tenant/user from server scope (`jobs.create`) |
| POST | `/api/{videos,instagram,web,pdf,documents,audio}/process/stream` | A + scope | as above |
| POST | `/api/chat`, `/api/chat/stream` | A + scope | conversation resource keyed `conversation:<id>` |
| POST | `/api/search`, `/api/compare` | A + scope | retrieval filter = tenant (`vectorstore._ownership`) |
| GET | `/api/jobs/{id}` | A + scope | `jobs.owned` — tenant **and** user must match, else 404 + audit event |
| DELETE | `/api/jobs/{id}` | A + scope | same as above |

### Cloud (modal) — read/write routes

| Method | Path | Guard | Ownership check |
|---|---|---|---|
| GET | `/api/sources`, `/api/sources/{id}` | A + scope | store loaded with `scope().tenant_id` |
| GET | `/api/sources/{id}/link\|download\|view` | A + scope | tenant-prefixed storage key; signed URL TTL 60 s |
| DELETE | `/api/sources/{id}` | A + scope | tenant-scoped delete in store + Qdrant filter |
| GET | `/api/notes` / POST / DELETE | A + scope | notes inside tenant store blob |
| GET | `/api/graph`, `/api/timeline`, `/api/stats` | A + scope | tenant store blob / tenant Qdrant filter |
| POST | `/api/notes` (legacy local path) | A + scope | — (not mounted in modal for writes beyond notes) |
| GET | `/api/chat/conversations/{id}` | A + scope | conversation matched on tenant **and** user |
| GET | `/api/metrics` | A | aggregate counters only, no tenant data |
| GET | `/` | A | minimal service banner |

### Local (dev)

| Class | Routes | Guard |
|---|---|---|
| Ingestion POSTs (`/api/{type}/process[/stream]`), `/api/chat*`, `/api/search`, `/api/compare` | `K` when `API_KEY` set, else open | |
| Notes create/delete, source delete | `K` when `API_KEY` set, else open | |
| All GETs, health, metrics | open (dev) | |

## Explicit non-features (deny by construction)

* No route accepts `tenant_id` / `user_id` in path, query, header or body —
  Pydantic request models discard unknown fields (`app/api/cloud_jobs.py`).
* In modal mode the legacy synchronous ingestion/chat/search/compare POST
  handlers are **not mounted at all** (`app/main.py`) — the job facade is the
  only heavy-write path, so idempotency, leases and scope always apply.
* `Idempotency-Key` identity includes tenant + user, so keys cannot collide
  across tenants (`app/services/jobs.py`).
* Qdrant point IDs embed the tenant UUID — cross-tenant overwrite is
  impossible (`app/services/vectorstore._point_id`).
* Rate-limit identity keys derive from the authenticated scope, not from
  client headers (`app/core/ratelimit.py`).

## Cross-tenant denial tests

| Case | Test |
|---|---|
| Job read/cancel as wrong tenant | `test_auth_matrix::test_cross_tenant_job_denied` (audited 404) |
| Forged tenant in body/header ignored | `test_auth_matrix::test_identity_not_taken_from_request` |
| Qdrant filter always tenant-scoped in cloud | `test_auth_matrix::test_vector_filter_tenant_scoped` |
| All routes fail closed without bearer (modal) | `test_auth_matrix::test_every_route_requires_auth_in_modal` |
| Legacy ingestion routes absent in modal | `test_auth_matrix::test_no_legacy_sync_routes_in_modal` |
