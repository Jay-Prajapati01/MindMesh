# Secret Rotation Checklist (audit P0-1)

**Status: ACTION REQUIRED BY THE USER — an assistant cannot rotate external
credentials.** The git-history scan performed on 7 October 2026 found no
service-role keys, JWTs, private keys or AWS keys in the repository history;
the only credential-shaped values present are Supabase **anon keys** (legacy
JWT form, formerly `sb_publishable_…`), which are public by design.

However, credentials were **pasted into chat during earlier sessions** —
including this project's service-role key and anon key on 8 October 2026.
Chat paste is outside the repository and cannot be scanned or rotated from
here. Treat every credential that ever appeared in chat, a shell history, a
CI log or an `.env` file as compromised until rotated.

## Rotate in this order

| # | Credential | Where | How | Verify |
|---|---|---|---|---|
| 1 | Supabase **service-role** key | Supabase dashboard → Settings → API | Rotate key; update `SUPABASE_SERVICE_ROLE_KEY` in the deployment secret store and the `mindmesh-production` Modal secret; redeploy backend + workers | Old key returns 401; app healthy; ingest one source end-to-end |
| 2 | Supabase **database** password | Supabase → Settings → Database | Rotate; update `SUPABASE_DB_URL` everywhere | `SELECT 1` through the app; health/detailed `database: ok` |
| 3 | Supabase **anon/publishable** key | only if a leak is suspected (it is public by design) | Project settings → regenerate | sign-in works after updating frontend build env |
| 4 | Redis credentials | Redis provider console | Rotate password; update `REDIS_URL` in backend + Modal secret | `GET /api/health/detailed` shows `redis: ok`; a job round-trip works |
| 5 | Qdrant API key | Qdrant Cloud dashboard | Rotate; update `QDRANT_API_KEY` (backend + Modal) | search returns results; readiness `qdrant: ok` |
| 6 | Modal token/secret | `modal token` CLI + `mindmesh-production` secret | Re-issue; update the Modal secret values | `modal deploy` works; dispatcher cron runs |
| 7 | CI/registry tokens | GitLab → CI/CD variables | Rotate + move to **protected, masked** variables | next pipeline passes |
| 8 | Any personal password reused in `.env` | identity provider | change it | — |

## After rotating

1. Re-run the scan: `gitleaks detect --source . --redact` (wired into CI as
   the `secret-scan` job in `.gitlab-ci.yml`).
2. Confirm `.env*` files are git-ignored (`.gitignore` covers `.env.*`) and
   never commit them — deploy env files are read from the secret store only.
3. Revoke active Supabase sessions if a service-role key was exposed:
   set `mm_memberships.active = false` temporarily or force sign-out via the
   Auth admin API.
4. Record the rotation time and operator in the incident log.

## Preventive rules

* Secrets live only in: Modal secrets, the deployment host env file (never in
  git), and the CI protected-variable store.
* Never paste secrets into chat, issues, screenshots or logs; the backend
  logging formatter already redacts sensitive fields — keep it that way.
* Rotate on schedule: service-role/db/Redis every 90 days, CI tokens every
  180 days, immediately after any suspected exposure.
