# MindMesh implementation report

Implemented against the current open codebase on 6 October 2026. Source changes
are present in the working tree. This report describes implementation, not a
successful runtime/deployment validation.

## 1. Files created

| Path | Purpose |
|---|---|
| `backend/app/core/tenant.py` | Immutable tenant/user/job/resource context with fail-closed scope access |
| `backend/app/core/cloud_auth.py` | Supabase token validation and server-side active membership resolution |
| `backend/app/core/browser_guard.py` | Browser request URL guard reused by Crawl4AI and Instagram |
| `backend/app/services/cloud_db.py` | Supabase Postgres state/results and transactional tenant locks |
| `backend/app/services/cloud_storage.py` | Private tenant-prefixed objects, bounded reads, signed source links |
| `backend/app/services/jobs.py` | Redis queue, idempotency, atomic states, leases, retries, cancellation |
| `backend/app/services/job_runner.py` | Reuse existing service/API handlers inside authorized cloud jobs |
| `backend/app/services/modal_client.py` | Trusted Qwen/BGE/Whisper calls and private audio staging |
| `backend/app/services/storage_maintenance.py` | Expired inputs/scratch cleanup, excluding stored originals |
| `backend/app/api/cloud_jobs.py` | Queue facade, status/cancel routes, SSE compatibility |
| `backend/requirements-api.txt` | Lightweight API/control dependencies |
| `backend/Dockerfile.cloud` | API-only production image without local models/browser stack |
| `workers/__init__.py` | Worker package |
| `workers/modal/__init__.py` | Modal package |
| `workers/modal/app.py` | Modal application, GPU classes, CPU functions, schedules |
| `workers/modal/images.py` | Separated container images and code packaging |
| `workers/modal/requirements-documents.txt` | Document dependencies |
| `workers/modal/requirements-ingestion.txt` | Browser/media dependencies |
| `supabase/migrations/202610060001_cloud_workers.sql` | Tenants/memberships/state/results schema, RLS, private bucket |
| `scripts/migrate_cloud.py` | Explicit-owner migration through re-ingestion; no old-vector copying |
| `deploy/cloud.env.example` | Server/Modal configuration template without credentials |
| `deploy/docker-compose.cloud.yml` | Standalone cloud frontend/API deployment |
| `frontend/cloud.env.example` | Public build-time configuration template |
| `frontend/lib/auth.ts` | Browser bearer-token headers and execution-mode flag |
| `frontend/components/CloudAuthGate.tsx` | Invited-user sign-in, sign-out, identity-change cache clearing |
| `frontend/app/source/[id]/page.tsx` | Authenticated source link resolution |
| `docs/MODAL_DEPLOYMENT.md` | Architecture, inventory, operational setup, commands, limitations |
| `docs/MODAL_IMPLEMENTATION_REPORT.md` | This report |

## 2. Files modified

| Path | Changes |
|---|---|
| `.gitignore` | Model/cache/download/temporary/credential exclusions |
| `backend/app/core/config.py` | Cloud settings and fail-closed production validation |
| `backend/app/core/security.py` | Cloud mutations require authenticated context; local API-key behavior retained |
| `backend/app/core/logging.py` | Allowlisted structured cloud logs without legacy exception/content strings |
| `backend/app/main.py` | Cloud auth middleware and queue routes ahead of local processing routes; job header CORS; cloud errors; body-limit logging fix |
| `backend/app/models/schemas.py` | Conversation identifiers in chat requests/results |
| `backend/app/api/chat.py` | Persisted user-scoped conversations and prior-turn retrieval |
| `backend/app/api/health.py` | Cloud health no longer calls local Ollama |
| `backend/app/api/pdf.py` | Heading-aware chunks/page count in shared ingestion |
| `backend/app/api/sources.py` | Authorized private source links and cloud downloads |
| `backend/app/services/store.py` | Cloud state adapter, idempotent activity and persisted conversations |
| `backend/app/services/graph.py` | Cloud persistence and transactional source-edge replacement |
| `backend/app/services/vectorstore.py` | Tenant filters/IDs/payloads, API key, dimension/model checks, full filtered deletion |
| `backend/app/services/file_storage.py` | Cloud storage adapter and persisted-original storage statistics |
| `backend/app/services/embeddings.py` | Modal BGE-M3 path without shared user-content cache |
| `backend/app/services/llm.py` | Modal Qwen path with no local production fallback |
| `backend/app/services/whisper_model.py` | Remote transcription adapter for all existing speech paths |
| `backend/app/services/ingest.py` | Batched embeddings, structured chunks, idempotent graph replacement, retry propagation |
| `backend/app/services/pdf_pipeline.py` | Explicit Tesseract Docling backend, cached artifacts |
| `backend/app/services/pdf.py` | OCR documentation aligned with retained Tesseract fallback |
| `backend/app/services/instagram.py` | Pre-request browser guard; existing extraction fallbacks retained |
| `backend/app/services/web.py` | Cloud browser-first behavior, request guard, missing settings lookup fixes |
| `backend/requirements.txt` | Modal/Redis/Postgres/dotenv added; Paddle packages removed |
| `frontend/Dockerfile.prod` | Public cloud configuration supplied at build time |
| `frontend/app/layout.tsx` | Authentication gate inside existing providers |
| `frontend/app/chat/page.tsx` | Persist/restore conversation identifier and server history |
| `frontend/app/stored/page.tsx` | Authenticated file viewing route |
| `frontend/app/settings/page.tsx` | Actual stored-original count and size |
| `frontend/components/chat/AnswerCard.tsx` | Protected original-file citation links |
| `frontend/components/chat/InlineCitation.tsx` | Handle authenticated frontend source routes |
| `frontend/components/chat/SourceReferenceCard.tsx` | Protected file links in source cards |
| `frontend/lib/api.ts` | Bearer auth, HTTP-202 polling, conversation IDs, cloud file links, storage metrics |
| `frontend/lib/processManager.ts` | Authenticated ingestion, idempotency key, cloud polling/reconnect/cancel, minimal persisted job metadata |
| `README.md` | Link to the current cloud implementation/deployment guides |
| `DEPLOYMENT.md` | Identify new cloud production instructions |
| `docs/MINDMESH_ARCHITECTURE_PLAN.md` | Identify historical plan versus implemented cloud architecture |

## 3. Files removed

None. Existing local Docker configuration, parsers, local Ollama support and tests
were retained. No secrets, models or runtime data were committed.

## 4. Dependencies

- Added server dependencies: `modal>=1.0,<2`, `redis>=5.2,<7`,
  `psycopg[binary]>=3.2,<4`, `python-dotenv>=1,<2`.
- Added isolated model-image dependencies: Torch 2.6, Transformers 4.51–4.x,
  Accelerate, Sentence Transformers, SentencePiece. Whisper's image includes its
  existing Faster-Whisper 1.1 dependency and CUDA/cuDNN runtime.
- Existing Docling, PyMuPDF, document parsers, Playwright, Crawl4AI, yt-dlp,
  transcript API and Instaloader were grouped by worker responsibility.
- Removed `paddleocr` and `paddlepaddle` after changing the only dynamic OCR
  selection to Docling's Tesseract CLI backend. Tesseract/pytesseract stay because
  PDF fallback and Instagram OCR depend on them.
- Nomic is a local Ollama model selection, not a Python dependency. It remains
  available locally and is rejected as the cloud embedding configuration.
- No frontend package changes: the existing Supabase JS dependency is reused.
- No dependencies were installed/resolved during this task. Version bounds and
  image definitions still require manual build assessment.

## 5. Modal architecture

One app: `mindmesh-workers`; environment: `main`. Qwen3-8B uses A10G; BGE-M3
and Faster-Whisper use separate T4 workers. Document/browser processing uses CPU
workers, and RAG/query orchestration uses a small control image. GPU workers load
models once per warm container, share only model weights via a Modal Volume,
have bounded container counts and scale to zero. Docling weights are image-cached.
The full allocation table is in `MODAL_DEPLOYMENT.md`.

## 6. Data flow

Next.js → FastAPI → Supabase Auth/membership resolution → private input storage →
Redis job → Modal dispatcher → appropriate CPU worker → remote model calls →
tenant-scoped Supabase metadata/graph/results and Qdrant → Redis status → FastAPI
status/SSE → frontend. Lightweight reads/CRUD remain in FastAPI. Production refuses
local AI execution. The frontend receives no Modal or server credentials.

## 7. Multi-tenancy

`tenant_id` and `user_id` come from token validation plus active membership,
`job_id` is server-generated, and `resource_id` is derived from the request/file or
conversation. Worker/model calls require all four and recheck the authoritative
job/membership. Storage keys are tenant-prefixed, database state is tenant-keyed,
and all user vector access filters ownership within Qdrant. Jobs/conversations
are additionally user-scoped; source/graph/notes are shared within the workspace.

## 8. Secrets

Modal Secret: `mindmesh-production`.

Required names: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `REDIS_URL`, `QDRANT_URL`,
`QDRANT_API_KEY`. Optional names: `IG_USERNAME`, `IG_PASSWORD`.
Future CI-only names: `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`.
No credential values are present in this report or the new templates.

## 9. Deployment

After manual Supabase/Redis/Qdrant setup and saving the populated
`deploy/.env.modal`, deploy from PowerShell:

```powershell
Set-Location 'J:\Mindmesh by gitlab\mindmesh-main'
if (-not (Test-Path '.venv\Scripts\python.exe')) { py -3.11 -m venv .venv }
.\.venv\Scripts\Activate.ps1
python -m pip install 'modal>=1.0,<2'
python -m modal setup
python -m modal secret create --env main mindmesh-production --from-dotenv 'deploy\.env.modal'
python -m modal deploy --env main -m workers.modal.app
```

The deployment guide includes private configuration file preparation and cloud
Docker commands. Existing Modal secrets must be updated manually if already
present. No deployment was performed.

## 10. Manual configuration and practical limits

Rotate the exposed service-role key; apply the SQL migration; invite users and
assign memberships; supply the database connection plus hosted TLS Redis/Qdrant;
populate the secret; configure Next.js public variables/CORS; deploy the workers
and an always-on API/frontend host; explicitly migrate old data. Set provider
budgets, persistence, backups, retention and network egress controls.

Cloud SSE currently provides queue/coarse progress and a final completion, not
live model token streaming or all local PDF step events. Processing is at-least-once,
with no distributed transaction across services. JSON-per-tenant metadata is a
beta adapter. Cancellation applies to queued jobs only. These limits and recovery
procedures are documented; this report does not assert verified production readiness.

## 11. Testing status

**No tests were run, as instructed.** No application launch, image build, GPU/model
execution, schema application, deployment or smoke test was performed. Changes
remain unverified through execution and require the user's manual assessment.
