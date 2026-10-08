# MindMesh Google Cloud Deployment Guide

Target stack: Netlify (frontend) + Cloud Run API + private dispatcher +
Cloud Run Jobs (heavy ingestion) + Cloud Tasks (dispatch) + Supabase
(database/auth/files) + Qdrant Cloud (vectors) + Groq (chat/transcription)
+ Gemini (embeddings) + Hostinger (DNS).

Local development keeps working untouched: `JOB_BACKEND=redis` (default)
and `EMBEDDING_PROVIDER=ollama` preserve the existing Docker Compose,
Modal and CPU paths. Nothing local was deleted.

## 0. What the repo already implements

- Provider-independent embeddings (`EMBEDDING_PROVIDER=ollama|gemini`);
  Gemini uses `batchEmbedContents` with one request entry per chunk, so
  every stored chunk gets its own vector (`taskType` document vs query,
  768-dim Matryoshka truncation, model-aware cache keys).
- Postgres job lifecycle (`JOB_BACKEND=postgres|gcp`, `mm_jobs` table,
  transactional claims, lease reconcile, atomic quota counters).
- Cloud Tasks dispatch + private dispatcher (`app/dispatcher.py`, OIDC +
  shared-secret auth, crash-recovery sweeper) + run-to-completion worker
  (`python -m app.gcp_worker`, `MINDMESH_JOB_ID` per execution).
- Streaming cloud uploads (spool to ephemeral disk, stream to Supabase).
- Groq Whisper transcription in cloud mode (25 MB/file cap; no
  diarization — do not advertise it).
- Frontend job tracking with backoff, queued/processing phases and
  refresh-resume; `deploy/google-cloud/` manifests; `deploy-gcp.yml`
  builds images on PRs and deploys manually via Workload Identity
  Federation (no JSON keys).

## 1. Accounts and resources you must create (console work)

1. **Supabase** — project already exists. Apply migrations in order,
   including the new `supabase/migrations/202610090001_gcp_jobs.sql`
   (`mm_jobs`, `mm_quotas`); RLS stays enabled with zero browser policies
   (service-role only, same as the other tables). Create/verify the
   private `mindmesh-private` bucket. Note the TLS `SUPABASE_DB_URL`.
2. **Qdrant Cloud** — create a cluster, then an empty collection
   `mindmesh_gemini_v1` (768-dim, cosine). Never reuse the Ollama/BGE
   collections: different vector spaces are not comparable. All saved
   content must be re-ingested to re-embed.
3. **Groq** — API key + confirm chat model and Whisper availability.
4. **Google AI** — Gemini API key with embedding quota for your corpus.
5. **Google Cloud project** — enable APIs: Cloud Run, Cloud Tasks,
   Artifact Registry, Secret Manager, Cloud Logging, Cloud Billing.
   Create `mindmesh-containers` (Artifact Registry), the `mindmesh-jobs`
   queue (see `deploy/google-cloud/cloud-tasks.yaml` for the commands),
   service accounts `mindmesh-api`, `mindmesh-dispatcher`,
   `mindmesh-worker`, `mindmesh-tasks` with the IAM bindings in that file,
   and one Secret Manager secret per key in `env.example`. Create the
   Workload Identity Federation pool + `GCP_WIF_PROVIDER` /
   `GCP_DEPLOY_SERVICE_ACCOUNT` GitHub secrets for `deploy-gcp.yml`.
6. **Netlify + Hostinger** — site from `frontend/`, public vars only
   (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_EXECUTION_MODE=cloud`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`);
   point DNS at Netlify; add the domain to Supabase auth redirects and
   `CORS_ORIGINS`.

## 2. Build and test images locally first

```bash
docker build -f backend/Dockerfile.cloud -t mindmesh-api backend
docker build -f backend/Dockerfile.worker -t mindmesh-worker backend
```

Verify inside the worker image: Chromium launches, ` /tmp` is writable,
startup stays within Cloud Run Job limits on Linux.

## 3. Deploy order

1. Supabase migrations + bucket + auth redirects.
2. Qdrant collection + Groq/Gemini keys smoke-tested.
3. Artifact Registry, identities, secrets, queue, job, dispatcher.
4. `uvicorn app.main:app` image as `mindmesh-api`; health check.
5. Dispatcher service (internal ingress); send one test task.
6. Netlify + Hostinger domain + CORS.
7. End-to-end: submit one PDF, one YouTube link, one audio clip; watch
   `mm_jobs` rows move queued -> processing -> completed and results land
   in Supabase + Qdrant.

## 4. Beta verification checklist

Mark each only after verifying on the deployed system: YouTube
(captions/metadata/audio fallback), Instagram (reachability from GCP IPs),
PDF (text + scanned/OCR within page/memory/time limits), Documents
(docx/pptx/xlsx/csv/txt/md), Audio (Whisper transcripts searchable),
Web (HTML + JS-rendered crawl, SSRF on), Search (Gemini vectors, correct
tenant isolation), Ask AI (grounded answers with citations), Jobs (retry,
failure, cancel, crash recovery via the sweeper), Security (tenant A never
sees tenant B's content/files/jobs/search), Cost controls (quotas, logs,
concurrency 1, budget alerts).

## 5. Known beta limits

- One heavy job at a time; benchmark before raising concurrency.
- Audio files over 25 MB are rejected (Groq API limit).
- No speaker diarization in cloud audio.
- Uploads stream through the API (spooled, not buffered twice) rather
  than direct-to-storage signed URLs — revisit if egress/latency demands it.
- The dispatcher's crash-recovery sweep assumes a single replica.
