# MindMesh Operations Runbook — SLOs, Incidents, Backups (audit P0-11, P0-13)

Status: process defined 7 October 2026. Backup/restore **drill must be executed
in staging before launch** — see §4. Owner: on-call engineer (rotation to be
staffed before private beta).

## 1. Service level objectives

| SLO | Target | Window | Measured by |
|---|---|---|---|
| API availability (`/api/health` 200, non-5xx rate on authenticated reads) | 99.5% | 30 days | `mindmesh_http_requests_total{status}` (Prometheus, `GET /api/metrics`) |
| Job accept latency (POST process → 202) | p95 < 500 ms | 7 days | `mindmesh_http_duration_seconds_sum` + request count per route |
| Job completion latency (queued → terminal), chat/search class | p95 < 60 s | 7 days | job `created_at` vs terminal transition (Redis) |
| Job completion latency, heavy ingestion (PDF/audio/video) | p95 < 15 min | 7 days | as above |
| Error budget | 0.5% of requests; burn > 50%/week = freeze releases | rolling | alerts below |

Alert thresholds (start values, tune after beta):

| Signal | Warning | Page |
|---|---|---|
| 5xx rate (5 min) | > 1% for 10 min | > 5% for 5 min |
| `mindmesh_jobs_dlq_depth` | > 5 | > 25 |
| `mindmesh_jobs_queue_depth` | > 100 for 15 min | > 500 for 10 min |
| `mindmesh_auth_failures_total` rate | > 20/min | > 100/min (credential stuffing) |
| `mindmesh_rate_limited_total` | informational | sudden 10x (abuse) |
| `mindmesh_quota_rejected_total` | informational | sustained (customer-impacting) |
| Readiness `/api/health/detailed` = `degraded` | 1 check down > 5 min | any core check down > 2 min |
| Modal GPU spend/day | > 80% of daily budget | > 100% |

## 2. Severity levels and incident process

| Sev | Definition | Response | Communication |
|---|---|---|---|
| SEV1 | Cross-tenant data exposure, secret exposure, total outage, data loss | Page immediately, all hands | Status page + email within 30 min |
| SEV2 | Primary flows broken (ingest/search/chat) for all users, or job queue stuck > 30 min | Page, fix within 1 h | Status page within 1 h |
| SEV3 | One feature degraded, quota/limits misbehaving, single-tenant issue | Next business day | Ticket + in-app notice |
| SEV4 | Cosmetic, docs, minor UX | Backlog | — |

Incident procedure:

1. **Detect** — alert fires or report arrives. Acknowledge in the incident log.
2. **Declare** — open an incident entry: `SEVn`, start time, reporter, summary.
3. **Mitigate first** — rollback (`DEPLOYMENT.md` §Rollback), disable the
   affected feature flag/route, scale down a misbehaving worker, or rotate the
   affected credential. Do not debug production while bleeding.
4. **Contain security incidents** — if a credential leaked: rotate it first,
   then revoke sessions (`mm_memberships.active=false`), then investigate.
   Preserve logs (do not restart log drains).
5. **Fix forward** — root cause + test + normal review.
6. **Postmortem** (required for SEV1/SEV2 within 5 working days), template:

```markdown
# Postmortem: <one line>
- Severity / dates / duration / impact (users, tenants, data)
- Timeline (detection, mitigation, resolution — with timestamps)
- Root cause (contributing factors, not just the trigger)
- What went well / badly
- Action items (owner, deadline) — each with a tracking issue
- Detection gap: why didn't monitoring catch this sooner?
```

Escalation: on-call → engineering lead (15 min no ack) → founder/CTO (30 min).
Security issues additionally notify the security owner immediately.

## 3. Queue/job incident playbooks

| Symptom | First actions |
|---|---|
| Queue depth growing | Check Modal containers/GPU quota and spend; check `dispatch` cron last run; check Redis memory; drain by scaling `max_containers` if within budget |
| Jobs stuck `processing` | `reconcile()` runs every 30 s and requeues expired leases — if not, inspect lease keys; force-fail with `jobs.replay` after verifying no worker holds it |
| DLQ growing | Inspect `mm_job_results`/Redis error codes; classify: provider outage (replay after fix) vs bad input (leave for user report) |
| Modal image build failing | Pin to last known good image tag, redeploy, then debug build in CI |
| Qdrant degraded | Search fails soft (readiness shows `qdrant: error`); ingestion must hold — pause heavy jobs; restore from backup if data loss |

## 4. Backups, RPO/RTO and restore drill (audit P0-11)

| Data store | Backup mechanism | RPO | RTO |
|---|---|---|---|
| Supabase Postgres (`mm_state`, `mm_memberships`, `mm_job_results`) | Supabase daily PITR + logical `pg_dump` (see `DEPLOYMENT.md` §Backup) | ≤ 24 h (PITR: minutes) | ≤ 4 h |
| Supabase Storage (`mindmesh-private`) | Versioning + daily `gsutil rsync` of the bucket | ≤ 24 h | ≤ 8 h |
| Qdrant vectors | Point-in-time snapshot of the collection after each bulk migration; otherwise re-ingestable from sources | re-ingest = 0 loss | re-ingest time varies |
| Redis job state | Not backed up by design: jobs are ≤ 7 days, results mirrored to Postgres; stuck jobs are requeued by reconciliation | ≤ 0 (by design) | immediate requeue |
| Model/config metadata | Git (infra repo) | 0 | immediate |

**Restore drill checklist (must pass in staging before public launch):**

1. Take a synthetic-tenant backup (Postgres dump + storage rsync + Qdrant snapshot).
2. Provision a *disposable* Supabase project + Qdrant collection.
3. Restore Postgres, storage objects and Qdrant points.
4. Verify: source list, source detail, one download, one search hit, one graph
   query, notes, conversation history — all under a test tenant.
5. Record wall-clock times; compare against RPO/RTO above; file the evidence
   in `docs/evidence/` with timestamps. Failure = launch blocker.

## 5. Ownership

| Area | Owner role |
|---|---|
| Deploy/rollback | backend on-call |
| Secret rotation | security owner |
| Queue/DLQ replay | backend on-call |
| Backups + drills | platform owner |
| Postmortems | incident commander (rotating) |
