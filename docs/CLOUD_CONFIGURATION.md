# Cloud configuration reference

## Shared cloud runtime

`ENVIRONMENT=production`, `MINDMESH_EXECUTION_MODE=cloud`, `AUTH_ENABLED=true`, explicit HTTPS `CORS_ORIGINS`, TLS `SUPABASE_DB_URL`, HTTPS Supabase/Qdrant endpoints, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`, one configured LLM provider, and one embedding provider are required.

Keep `SUPABASE_SERVICE_ROLE_KEY`, database URLs, Qdrant keys, AI keys, Instagram credentials, and dispatch secrets server-side only. Browser and Android builds may contain only Supabase public/publishable keys and public API origins.

## Provider selection

AWS: `JOB_BACKEND=postgres`; do not set GCP dispatch variables. GCP: `JOB_BACKEND=gcp` and configure every `GCP_*` / `CLOUD_TASKS_*` variable in `deploy/google-cloud/env.example`.

`WORKER_POLL_SECONDS` controls PostgreSQL poll-mode latency for AWS (default 10 seconds; valid range 1–300). Lower values increase database polling load roughly in proportion to the number of worker containers.

Use a new Qdrant collection whenever embedding provider, model, or dimension changes. Never mix Gemini, BGE-M3, or Ollama vectors in one collection.
