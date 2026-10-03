# MindMesh — Security Assessment Report

| | |
|---|---|
| **Date** | 2026-10-03 |
| **Target** | MindMesh monorepo @ `f771ada` (master, local Docker stack) |
| **Scope** | `backend/` (FastAPI), `frontend/` (Next.js 15), `extension/` (MV3), `docker-compose.yml`, dependency manifests |
| **Method** | 3 passes: (1) static code review, (2) dependency CVE audit, (3) active probing against the locally running stack |
| **Out of scope** | Fuzzing/memory-safety, external-network perspective, production Supabase project (not accessible from this account), zero-day research |
| **Overall risk** | **HIGH** — combination of H-1 + H-2 + H-3 means a LAN attacker can read, alter and destroy the entire knowledge base with no credentials |

**Severity scale:** Critical = trivially exploitable full compromise · High = data disclosure/destruction without credentials · Medium = requires specific conditions or moderate effort · Low = defense-in-depth gaps · Info: hygiene/observations.

All probe artifacts created during this assessment (probe note, indexed SSRF source) were **deleted after testing**; Qdrant verified to contain zero leftover probe points. The repo working tree was not modified except this report.

---

## 1. Executive Summary

**33 findings: 3 High, 11 Medium, 11 Low, 8 Info.**

The three issues that matter, all **confirmed by active testing**:

1. **H-1 — SSRF in web ingestion**: `POST /api/web/process[/stream]` fetches any URL with no IP/scheme-target validation. Confirmed end-to-end: fetched an internal-only service (`http://host.docker.internal:3000/`, 4409 chars), returned its content to the caller, summarized and **indexed it into the vector DB**.
2. **H-2 — Qdrant exposed without authentication**: `docker-compose.yml` publishes `6333/6334` on all interfaces with no API key. Confirmed: unauthenticated `GET /collections` returned the collection list. This is the whole user knowledge base, readable **and writable/deletable**, and it bypasses even the backend's production API-key gate.
3. **H-3 — Authentication and rate limiting are effectively absent in real deployments**: the API-key guard activates only when `ENVIRONMENT=production` (exact case), but the shipped frontend never sends `X-API-Key`, so production mode breaks the UI and operators run `development`. Confirmed live: `ENVIRONMENT=development`, unauthenticated `POST /api/notes` created a record (HTTP 200), and 60 rapid requests returned 60× HTTP 200 (no 429).

Dependency audit found **66 Python advisory instances (6 packages)** and **12 npm vulnerabilities (9 high)** including direct runtime dep `axios@1.7.9`.

Everything else checked out well: **no command injection, no path traversal, no XSS sinks, no SQL/NoSQL injection, no insecure deserialization, no open redirects, no secrets in the repo, CORS does not reflect hostile origins, and the browser extension permissions are minimal** (see §6).

---

## 2. Active Test Log (evidence)

| # | Test | Request | Observed result | Verdict |
|---|------|---------|-----------------|---------|
| A1 | Direct DB access | `GET localhost:6333/collections` | `HTTP 200 {"result":{"collections":[{"name":"mindmesh"}]}}` | ❌ Vulnerable (H-2) |
| A2 | Unauthenticated write | `POST /api/notes` (no API key) | `HTTP 200 {"id":"29409e88-…"}`; record visible via GET | ❌ Vulnerable (H-3) |
| A3 | Rate limiting | 60× rapid `GET /api/stats` | 60× `HTTP 200`, no `429` | ❌ Vulnerable (H-3) |
| A4 | Runtime gates | `printenv ENVIRONMENT` / `API_KEY` | `development` / `set` (unused — guard inactive) | ❌ Vulnerable (H-3) |
| A5 | SSRF (internal HTML) | `POST /api/web/process/stream {"url":"http://host.docker.internal:3000/"}` | Fetched 4409 chars; SSE `preview` returned page content; summary streamed; **indexed** (`complete {"source_id":"9483e0be2dfcaa06"}`) | ❌ Vulnerable (H-1) |
| A6 | SSRF (internal service, raw port) | `POST …/stream {"url":"http://127.0.0.1:6333/"}` | No IP block; error echoed internal URL: `"Failed to fetch content: Could not extract readable content from http://127.0.0.1:6333/"` | ❌ Vulnerable (H-1) + L-1 |
| A7 | Parameter validation | `POST /api/search {"top_k":-1}` | `HTTP 500 Internal Server Error` (should be 422) | ❌ Vulnerable (M-2) |
| A8 | Parameter validation | `POST /api/search {"top_k":10000000}` | Accepted in 0.3 s; returned 225 KB — the **entire collection** | ❌ Vulnerable (M-2) |
| A9 | Swagger exposure | `GET /docs` | `HTTP 200` | ⚠️ Info (I-1) |
| A10 | Path traversal | `GET /api/sources/..%2f..%2f..%2fetc%2fpasswd` | `HTTP 404` | ✅ Safe |
| A11 | CORS hostile origin | `GET /api/stats` with `Origin: https://evil.example` | `access-control-allow-credentials: true` but **no** `access-control-allow-origin` → browser blocks | ✅ Safe |
| A12 | Security headers | `GET localhost:3000` | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS **all missing** | ❌ Vulnerable (M-5) |

---

## 3. Findings

### HIGH

#### H-1 — SSRF: web ingestion fetches arbitrary internal URLs (confirmed exploitable)
**Location:** `backend/app/services/web.py:66-67, 127, 181-184, 245-251` · `backend/app/api/web.py:25-42, 71, 94`
**Evidence:** the only validation is a scheme-prefix check (`url.startswith(("http://","https://"))`); `httpx.AsyncClient(..., follow_redirects=True)`; **no `ipaddress`/private-range/metadata-IP handling exists anywhere in the backend** (grep-verified). `httpx` runs *first* (`web.py:125-129`), so raw internal fetches happen even before the headless browser.
**Attack:** a caller supplies `http://qdrant:6333/collections/mindmesh/points/scroll?...` (entire vector DB), `http://host.docker.internal:11434/…` (Ollama), `http://192.168.x.x/…` (LAN scan) or a cloud metadata URL. The response is returned in the SSE `preview` event (`api/web.py:93-94`) and then **summarized, embedded and indexed**, making internal data retrievable via `/api/search` forever. Redirects to internal targets are followed without revalidation; DNS rebinding is unmitigated.
**Confirmed:** tests A5 (full E2E) and A6.
**Fix:** resolve the hostname before fetching and reject loopback/private/link-local/reserved ranges (IPv4 **and** IPv6 incl. `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped) with `ipaddress`; disable auto-redirects and re-validate every `Location`; block metadata hostnames; apply to **both** the httpx and Crawl4AI paths and to `_fetch_pdf_url`.

#### H-2 — Qdrant published on all interfaces with no authentication (confirmed exploitable)
**Location:** `docker-compose.yml:40-45`
**Evidence:**
```yaml
qdrant:
    ports:
      - "6333:6333"
      - "6334:6334"
```
No `QDRANT__SERVICE__API_KEY` anywhere in the repo; Qdrant has no auth by default.
**Attack:** any host that can reach the machine can list, read, overwrite or **delete** every embedded chunk of the knowledge base over REST/gRPC — including in a "production" deployment where the backend API requires `X-API-Key` (the DB becomes a deliberate auth bypass). Confirmed by test A1.
**Fix:** remove the `ports:` block entirely (backend reaches Qdrant as `http://qdrant:6333` on the compose network); if host access is needed, bind `127.0.0.1:6333:6333` and set `QDRANT__SERVICE__API_KEY` (passed to `QdrantClient`).

#### H-3 — Authentication and rate limiting effectively absent in real deployments (confirmed)
**Location:** `backend/app/core/security.py:19-27` · `backend/app/main.py:39-79, 109-122, 137-143` · `frontend/lib/api.ts:7-10` · `core/config.py:14`
**Evidence:**
```python
# core/security.py:19 — gate is off unless env is EXACTLY "production"
if settings.environment != "production":
    return
```
Default is `development`; the rate limiter is registered **only** in production (`main.py:110`); the guard is a case-sensitive string compare (`ENVIRONMENT=Production` silently disables it); the API key check uses `!=` instead of `secrets.compare_digest` (timing). Critically, **the shipped frontend has no `X-API-Key` path at all** (grep of `frontend/` for `X-API-Key|apiKey` → zero matches), so enabling production mode breaks every mutating action in the UI — operators must run `development`.
**Attack:** confirmed — A2 created a note with no credentials; A3 saw zero rate limiting; A4 shows the live gate inactive. With H-2 and ports bound `0.0.0.0` (see M-3/`docker-compose.yml:8`), any LAN client has full read/write/delete over the knowledge base.
**Fix:** (1) add an API-key field in the frontend Settings and append `X-API-Key` in `lib/api.ts` (+ `lib/processManager.ts` fetches) so production is deployable; (2) always enable the rate limiter with configurable limits; (3) `secrets.compare_digest` for the key; (4) `environment.lower()` + startup validation against known values.

---

### MEDIUM

#### M-1 — No request-body size limit at the middleware layer
**Location:** `backend/app/core/uploads.py:18-36` · `models/schemas.py:88-98` · `api/notes.py:11-14` · uvicorn config (`backend/Dockerfile:31`, `docker-compose.yml:17`)
The 100/200 MB checks run **inside** the handler, but Starlette has already parsed the multipart body (spooling >1 MB to temp disk) before the handler is invoked; JSON bodies are fully buffered before Pydantic validation. A client can stream a huge `POST /api/audio/process` and fill the disk **before** the 413 fires. `history: list[ChatMessage]` and `NoteRequest.body` are unbounded.
**Fix:** top-level middleware rejecting `Content-Length > cap` (plus a streaming cap when the header is absent); `max_length`/`le` on schema fields.

#### M-2 — Unbounded `top_k` passed to Qdrant (confirmed)
**Location:** `models/schemas.py:54, 90` · `services/vectorstore.py:125-130` · `services/rag.py:173`
`top_k: int | None = None` with no `ge/le`. Confirmed: `-1` → HTTP 500 (A7); `10000000` → accepted, returned the whole collection (A8). On a large collection this materializes unbounded payloads/vectors in the app process (memory exhaustion).
**Fix:** `Field(default=None, ge=1, le=50)` on both `SearchRequest` and `ChatRequest` (pattern already exists at `api/sources.py:17-18`).

#### M-3 — `.env` baked into Docker image layers
**Location:** `backend/Dockerfile:27` (`COPY . .`); no `.dockerignore` (root or `backend/`) — verified absent
Build context includes `backend/.env` (holds `API_KEY`, `IG_USERNAME`/`IG_PASSWORD`) and `backend/data/`. Anyone with the image extracts credentials via `docker history`/`export`; CI builds it (`.gitlab-ci.yml`). Git hygiene itself is fine — `.env` was never committed.
**Fix:** add `backend/.dockerignore` (`.env`, `.env.*`, `!/.env.example`, `data/`, `tests/`, `__pycache__/`, `.pytest_cache/`) and `frontend/.dockerignore` (`.next`, `node_modules`, `*.log`, `*.tsbuildinfo`); or `COPY app/ ./app/` only.

#### M-4 — "Production" frontend image runs the Next.js **dev** server with live source mounts
**Location:** `frontend/Dockerfile:12` (`CMD ["npm","run","dev"]`) · `docker-compose.yml:31-38` (`./frontend:/app` bind mount)
No `next build` stage exists anywhere. Dev mode: error overlays disclose stack traces/paths, unminified source served, and any process with write access to `./frontend` changes the live site instantly (code execution in the app origin).
**Fix:** multi-stage build (`npm ci && npm run build` → `npm run start`), drop the bind mount, split a `docker-compose.prod.yml` without `--reload`/mounts (also see I-6).

#### M-5 — No Content-Security-Policy or any security headers (confirmed)
**Location:** `frontend/next.config.mjs:1-13` (no `headers()`), no `middleware.ts`, no CSP in `app/layout.tsx`
Confirmed all five standard headers absent (A12). Clickjacking is possible against the ingest/upload UI, and any future HTML-injection bug becomes immediately exploitable with no CSP to contain it.
**Fix:** add `headers()` in `next.config.mjs` — `Content-Security-Policy` (`default-src 'self'; img-src 'self' https: data:; connect-src 'self' http://localhost:8000 https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

#### M-6 — `next/image` wildcard → unauthenticated server-side fetch proxy
**Location:** `frontend/next.config.mjs:10` — `remotePatterns: [{ protocol: "https", hostname: "**" }]`
Only local `/logo.png` is ever used with `<Image>`, so the wildcard is pure attack surface: `GET /_next/image?url=https://internal-host/…` makes the server fetch attacker-chosen HTTPS URLs (internal probing, bandwidth amplification, optimizer-cache pollution).
**Fix:** `remotePatterns: []` (or enumerate exact hosts).

#### M-7 — Supabase contact form: anonymous insert, no rate limit, RLS policy not in repo (unverifiable)
**Location:** `frontend/components/landing/ContactPage.tsx:43-46` (client-side zod only) · `docker-compose.yml:25-26` (publishable key) — **no `.sql`/policy file exists in the repo** (grep-verified); the linked project (`anknukysxndknocioxnq`) is not accessible from this account to verify live.
The publishable key itself is public **by design** (not a leak) — but with no insert-only policy verifiable and no rate limit, anyone can flood `contact_submissions`, and if RLS is off the same key can `select`/`delete` every visitor's message.
**Fix:** commit the DLS as code: `alter table contact_submissions enable row level security;` + `anon` policy with `with check (true)` only (insert), **no** select/delete; DB `CHECK` constraints on lengths/email; abuse control (Turnstile or an Edge Function proxy with rate limiting).

#### M-8 — Stored (indirect) prompt injection into summaries, graph and chat answers
**Location:** `services/rag.py:13-32, 124-131, 244` · `services/compare.py:30-35` · `services/graph.py:66-72`
Ingested content is concatenated into prompts with no untrusted-content framing; the system prompt (`rag.py:18-32`) constraining answers to CONTEXT is a partial mitigation. A malicious page/ transcript ingested via H-1 can embed instructions that get **persisted** (summary in `store.json`, triples in graph, chunks in Qdrant) and resurface in later answers. Client-supplied `history` is also concatenated raw.
**Fix:** wrap CONTEXT/history in explicit delimiters declared as untrusted data; strip instruction-looking lines at ingestion; validate/normalize LLM JSON output (partially done already).

#### M-9 — Resource exhaustion: heavy pipelines uncapped; rate limiter design flaws
**Location:** `main.py:39-79` · `services/audio.py:22-27` · `services/pdf_pipeline.py:54-56, 126`
Whisper transcription (200 MB audio), Docling OCR and yt-dlp downloads run in-process with no semaphore/queue (~10 parallel streams can pin the CPU). The limiter's store never evicts idle IPs (unbounded `defaultdict` growth), keys only the direct peer (no trusted `X-Forwarded-For` handling → behind a proxy everyone shares one IP), and is off outside production (H-3).
**Fix:** always-on limiter; `asyncio.Semaphore`/job queue around transcription/OCR/downloads; prune idle IPs; honor `X-Forwarded-For` only from trusted proxies.

#### M-10 — Zip-bomb / entity expansion / unbounded PDF pages in parsers
**Location:** `services/document.py:62-68, 95-100, 141-158` · `services/pdf_validator.py:50-66` · `services/pdf_pipeline.py:56`
Only *compressed* size is capped (100–200 MB). `python-docx`/`openpyxl` decompress attacker ZIP/XML with no uncompressed-size or ratio check (5 MB `.xlsx` → many GB); XML parsed via lxml without defusedxml-style hardening; **no PDF page-count cap** — a 100 MB/10k-page PDF is processed fully, three times (validator → Docling with OCR → fallback).
**Fix:** pre-inspect `zipfile.ZipFile.infolist()` and reject on total-size/ratio thresholds; cap PDF page count and OCR page budget via settings.

#### M-11 — Vulnerable dependencies (see §5 for full tables)
Runtime-relevant: `axios@1.7.9` (multiple high advisories incl. SSRF/credential leakage, DoS), `starlette 0.41.3` (7 unique advisories, transitive pin via `fastapi 0.115.6`), `python-multipart 0.0.20` (6 — this is the package that parses your uploads), `Pillow 11.0.0` (16), `nltk 3.10.3` (1, **no fix available**).
**Fix:** see §5 remediation.

---

### LOW

#### L-1 — Exception details (internal URLs, temp paths) leaked over SSE streams (confirmed)
**Location:** `api/web.py:77, 161` · `api/audio.py:80, 155` · `api/documents.py:80, 156` · `api/pdf.py:126, 257` · `api/videos.py:89, 197` · `api/instagram.py:71, 151`
`yield sse("step_fail", {"error": f"Failed to fetch content: {exc}"})` — confirmed in A6: the caller was shown `http://127.0.0.1:6333/`. httpx/Docling/Qdrant errors carry internal URLs, temp paths and `site-packages` internals. The non-stream endpoints correctly return generic messages — streams are the inconsistent path.
**Fix:** `logger.exception(...)` server-side; emit generic message + correlation id.

#### L-2 — API-key comparison not constant-time; environment gate case-sensitive
**Location:** `core/security.py:19, 27` · `main.py:110` — see H-3 for context.
**Fix:** `secrets.compare_digest`; `environment.lower()`; startup validation/warning on unknown values.

#### L-3 — CORS foot-gun: `allow_credentials=True` with operator-controlled origin list (current config safe — confirmed)
**Location:** `main.py:100-107` · `core/config.py:64-66, 85-91`
Default is a safe explicit allowlist and A11 confirmed no reflection of hostile origins. But nothing rejects `CORS_ORIGINS=*` in config: Starlette would then **reflect** any Origin with credentials allowed. The production validator only warns on the exact localhost default.
**Fix:** at startup, reject `*` and any non-http(s) origin while `allow_credentials=True`; require explicit origins in production.

#### L-4 — Attacker-controlled file extension; bytes saved before validation in stream flows
**Location:** `services/file_storage.py:39-44, 78-96` · `api/audio.py:70` vs `:75` · `api/documents.py:70` vs `:75`
Traversal is **not** achievable (extension = text after final `.`; `source_id` is server-side SHA-1; `_safe_path` resolves + `relative_to()` guards — verified). Issues: (a) stream endpoints write bytes before format validation; (b) failure cleanup can be skipped when the same SHA-1 existed before (`file_storage.py:91-92`), stranding wrongly-named files.
**Fix:** allowlist extensions per type; derive `ext` server-side after validation; validate before `save_file`.

#### L-5 — Outbound fetches: timeout yes, response-size cap no
**Location:** `services/web.py:181-184, 245-251, 144-150`
`resp.text` buffers unbounded bodies (slow-drip gigabytes → RAM). Crawl4AI config sets no explicit timeout.
**Fix:** `client.stream()` with a byte counter (10–20 MB cap); explicit `page_timeout`/`wait_for` on `CrawlerRunConfig`.

#### L-6 — Log injection via raw user strings
**Location:** `services/web.py:129` · `services/file_storage.py:45` · upload filenames
URLs (`WebRequest.url`, up to 2048 chars incl. `\n`) and filenames are logged raw → forged log lines.
**Fix:** `unicode_escape`/sanitizer before logging.

#### L-7 — Frontend link scheme check uses `startsWith("http")`
**Location:** `components/search/SearchResultCard.tsx:241` · `components/chat/SourceReferenceCard.tsx:46` · `components/chat/InlineCitation.tsx:38,41`
`javascript:` is blocked, but any scheme *beginning with* `http` (`httpwhatever:`) becomes a clickable `href` from ingested data. Backend correctly requires `("http://","https://")` (`api/search.py:13-15`).
**Fix:** `new URL(v).protocol === "http:" || === "https:"`.

#### L-8 — Raw `<img>` thumbnails leak referrers
**Location:** `components/ThumbImage.tsx:30-36`
Backend-supplied `thumbnail` (arbitrary https URL from ingested content) rendered without `referrerPolicy` → tracking-pixel/origin-leak vector.
**Fix:** `referrerPolicy="no-referrer"`, require `https:` (+ ideally host allowlist).

#### L-9 — Extension sends active-tab URL to unvalidated configurable endpoint
**Location:** `extension/popup.js:14-20, 31-35`
`apiUrl` is free text (any scheme/host) in `chrome.storage.sync`; default `http://localhost:8000`. A tampered/suggested endpoint could receive the current tab's URL.
**Fix:** allow only `https:` or `http://localhost:8000`; visually warn on non-default endpoints; confirm before sending.

#### L-10 — `source_id` interpolated into URLs unencoded
**Location:** `frontend/app/stored/page.tsx:142, 177`
Currently safe (ids are `sha1[:16]` hex — verified), but path-escaping if id generation ever changes.
**Fix:** `encodeURIComponent(s.source_id)`.

#### L-11 — Unbounded string fields across request schemas
**Location:** `models/schemas.py:19` · `api/instagram.py:18` · `api/notes.py:11-14` · `api/compare.py:11-12` · `schemas.py:93`
Only `WebRequest.url`, `question` and `query` have `max_length`. Others accept multi-MB strings/lists (memory, `store.json` bloat).
**Fix:** `max_length` everywhere; `le=` on `history`.

---

### INFO

| ID | Finding | Location | Note |
|----|---------|----------|------|
| I-1 | `/docs` + `/openapi.json` served even in production, exempt from rate limiting | `main.py:115-121, 137+` | Confirmed HTTP 200 (A9); full API-surface discovery. Disable or protect in production |
| I-2 | `/api/health/detailed` reveals internal base URLs + error details unauthenticated | `api/health.py:40, 49` | e.g. `http://host.docker.internal:11434`, `http://qdrant:6333`. Return `ok/error` only in non-debug |
| I-3 | Loose pins on hostile-input parsers: `yt-dlp>=2025.2.19`, `docling>=2.0.0`, `paddleocr>=2.7.0`, `playwright>=1.40.0`, `crawl4ai>=0.9.0` | `requirements.txt:7-26` | Each build pulls whatever is current, for exactly the libs parsing hostile input. Core HTTP stack is sensibly pinned |
| I-4 | Container runs as root; Chromium `--no-sandbox`; `crawl4ai-setup \|\| true` masks failure | `backend/Dockerfile:1-31` · `services/instagram.py:193` | Non-root `USER`, drop `--no-sandbox`, remove `\|\| true` |
| I-5 | Frontend image build non-reproducible (`package-lock.json` not copied; `npm install`) | `frontend/Dockerfile:5-6` | `COPY package.json package-lock.json` + `npm ci` |
| I-6 | Dev posture: `uvicorn --reload`, bind mounts, polling watchers, no `restart`/`healthcheck`/resource limits | `docker-compose.yml:11-38` | Ship a `docker-compose.prod.yml` with healthchecks, `restart: unless-stopped`, `deploy.resources.limits` |
| I-7 | `reactStrictMode: false` | `frontend/next.config.mjs:3` | Enables `true` |
| I-8 | Supabase URL + publishable key committed in compose | `docker-compose.yml:25-26` | **Not a secret leak** — publishable keys are public by design; only relevant to M-7's policy gap |

---

## 4. Global Observations

- **Unauthenticated reads are intentional** for this self-hosted single-user tool (search/chat/sources/stats/`/docs`). Not reported per-endpoint; the risk materializes only because compose publishes ports on `0.0.0.0` (M-4/I-6) — binding to `127.0.0.1` reduces the attacker set to local processes.
- **CORS is the main drive-by defense**: the API uses an explicit allowlist with no reflection (A11), and preflight-blocked `application/json` means a malicious website cannot trivially write to `http://localhost:8000`. The threat model is therefore **LAN attackers, exposed ports and malicious ingested content** — not random web pages.

---

## 5. Dependency Audit

### 5.1 Python (`pip-audit -r backend/requirements.txt`) — 66 advisory instances (incl. mirror duplicates), 6 packages

| Package | Pinned | Unique advisories | Fix in | Runtime? |
|---------|--------|-------------------|--------|----------|
| **starlette** | 0.41.3 | 7 (PYSEC-2026-161/248/249/1941/1942/2280/2281) | 1.3.1 | Yes — transitive via `fastapi==0.115.6`, so **FastAPI must be upgraded too** |
| **python-multipart** | 0.0.20 | 6 (PYSEC-2026-1852/3036/3037/3038/3039/3040) | 0.0.31 | **Yes — parses all uploads** |
| **Pillow** | 11.0.0 | 16 (incl. PYSEC-2026-165/2249-2257/3451-3496/2874) | 12.3.0 | Yes — image processing |
| **docling-core** | 2.74.0 | 2 (2456/2457) | 2.74.1 | Yes — PDF pipeline |
| **nltk** | 3.10.3 | 1 (PYSEC-2026-3740) | **none available** | Yes — text processing |
| **pytest** | 8.3.4 | 1 | 9.0.3 | Dev only |

### 5.2 npm (`npm audit` in `frontend/`) — 12 vulnerabilities (9 high, 1 moderate, 2 low)

| Package | Direct? | Advisory summary | Fix |
|---------|---------|------------------|-----|
| **axios 1.7.9** | **Yes (runtime)** | SSRF/credential leakage via absolute URL (GHSA-jr5f-v2jv-69x6), DoS via unbounded response (GHSA-4hjh-wcwx-xvwj), NO_PROXY bypass SSRF (GHSA-3p68-rc4w-qgx5) + more | bump to latest 1.x |
| next / postcss | transitive | ReDoS/DoS class advisories in build chain | `npm audit fix --force` → next@16 (**breaking**; do as planned upgrade) |
| eslint-config-next | transitive | high (via fast-glob) | eslint toolchain bump |
| @eslint/plugin-kit | transitive | low (ReDoS, GHSA-xffm-g5w8-qvg7) | `npm audit fix` |

**Remediation order:** (1) `npm install axios@latest` (runtime, small blast radius); (2) `python -m pip install --upgrade python-multipart pillow docling-core` + FastAPI/starlette upgrade in one tested PR (run the 66 pytest suite); (3) track `nltk` advisory (no fix yet — isolate/monitor); (4) add `pip-audit` + `npm audit` steps to `.gitlab-ci.yml`; (5) plan next@16 upgrade for the postcss chain.

---

## 6. Coverage — Checked and Found Safe

**Backend (static):**
- **Command/argument injection — clean.** Zero `subprocess`/`os.system`/`shell=True` in app code; yt-dlp driven via Python API and never receives the raw URL (URLs rebuilt from `[0-9A-Za-z_-]{11}` IDs, `youtube.py:11-13, 50-56`); fixed `outtmpl`; ffmpeg only as yt-dlp postprocessor; tesseract/whisper/docling receive bytes or server-generated temp paths; instaloader/Playwright URLs rebuilt from charset-restricted shortcodes.
- **Path traversal — safe.** Files written only as `{source_id}.{ext}`; `_safe_path` does `resolve()` + `relative_to()` (`file_storage.py:49-58`); no user-supplied path ever served; no `StaticFiles` mount; active test A10 → 404.
- **Stored XSS / content types — safe.** No `HTMLResponse` endpoint exists (JSON + SSE only); `/view`/`/download` serve fixed `mime_map` values, never `text/html`; `html`/`svg` extensions rejected by format allowlists; `Content-Disposition` quoted by Starlette; h11 rejects CRLF header injection.
- **SSE injection — safe.** Every `sse()` call passes a dict → `json.dumps` escapes newlines (`services/sse.py:10-12`); chat builds `data:` lines with `json.dumps` too.
- **Data-store injection — safe.** No SQL/Postgres/SQLAlchemy/Redis anywhere (JSON files with locks + atomic replace); Qdrant filters are structured `FieldCondition` objects — user values never become filter strings.
- **Insecure deserialization — safe.** `json.loads` only (incl. LLM output); no `pickle`/`yaml.load`/`joblib`/`np.load`; whisper model name is the constant `"base"`.
- **YouTube/Instagram input validation — safe.** Host/ID regexes, charset-restricted shortcodes; `file://` and non-http schemes rejected for web ingestion.
- **Citation URL schemes — safe.** `rag.py:202-213`, `search.py:13-32` emit only http(s) or server-relative paths.
- **Regex robustness — no obvious ReDoS** in sentence/heading/OCR-fix patterns or URL matchers.
- **Secrets — clean.** `.env` never tracked (`git log --all` empty); no hardcoded keys; only placeholders in `.env.example`/docs/CI.

**Frontend/extension/infra (static):**
- **XSS — zero sinks.** Repo-wide grep (excl. node_modules): no `dangerouslySetInnerHTML`, `innerHTML`, `rehype-*`, `react-markdown`, `marked`, `katex`, `eval`, `new Function`, `document.write`, `srcdoc`, `iframe`. LLM answers and citations render as escaped React text nodes (`AnswerCard.tsx:100-130` etc.). No dynamic `style` from user strings.
- **URLs/redirects — safe.** `javascript:` cannot reach `href` (four link builders gate on http/`/` regexes); every `target="_blank"` has `rel="noopener noreferrer"`; **no open redirects** (no `redirect()`, no `next`/`returnUrl` params).
- **Cookies/credentials — none.** No `document.cookie`, `withCredentials`, or `credentials:"include"` anywhere; axios instance is credential-free (A11 confirms CORS behavior).
- **Supabase key — expected public** (publishable key; I-8/M-7).
- **Extension — minimal permissions.** `activeTab` + `storage` + `host_permissions: ["http://localhost:8000/*"]` — not `<all_urls>`; no content scripts, no `web_accessible_resources`, no remote code; popup DOM writes use `textContent`.
- **Storage — clean.** localStorage holds only theme/UI settings/process state — no tokens/credentials.
- **Egress — clean.** All frontend outbound URLs are localhost/Supabase; no telemetry/analytics/CDN scripts; stream endpoints are hardcoded constants.
- **Build scripts — clean.** No `eval`/`curl|sh` in package scripts, Dockerfiles or QA tooling; QA scripts contain no credentials.
- **Containers — no privileged mode, no `pid: host`, no docker.sock/ssh mounts.**

---

## 7. Remediation Roadmap

**P0 — do now (hours):**
1. Remove Qdrant `ports:` from `docker-compose.yml`; bind backend/frontend to `127.0.0.1` (H-2, exposure for H-3).
2. Add `backend/.dockerignore` + `frontend/.dockerignore` (M-3).
3. `top_k: Field(..., ge=1, le=50)` in both request schemas (M-2).
4. Content-Length middleware cap (M-1).
5. Security headers in `next.config.mjs` (M-5).
6. `npm install axios@latest` (M-11).

**P1 — next sprint (days):**
7. SSRF guard: `ipaddress` validation + redirect revalidation on **both** fetch paths (H-1).
8. Frontend API-key support so `ENVIRONMENT=production` is deployable; always-on rate limiter; `secrets.compare_digest`; case-normalized env gate (H-3, L-2, M-9).
9. Production Dockerfiles: `npm run build/start`, no bind mounts, non-root user (M-4, I-4, I-5).
10. Commit Supabase RLS DDL (insert-only) + abuse control (M-7).
11. ZIP/PDF decompression + page-count caps (M-10).
12. Sanitize SSE error messages (L-1).
13. Python dependency upgrades in one tested PR (§5.1; run the 66-test suite).

**P2 — hardening (weeks):**
14. Prompt-injection framing/delimiters in RAG prompts (M-8).
15. `pip-audit`/`npm audit` in CI; pin hostile-input parser versions (I-3, M-11).
16. L-3 … L-11 fixes; prod compose with healthchecks/limits (I-6); `reactStrictMode` (I-7); decide on `/docs` in production (I-1).

---

## 8. Limitations & Honest Accuracy Notes

- **Localhost perspective only**: no external-network or VPN vantage point; port-exposure risk is inferred from compose bindings, not measured from a second machine.
- **No fuzzing, no memory-safety testing, no exhaustive protocol-level analysis** — commercial scanners (e.g. Strix) cover more ground here; this report is designed to be run **alongside** such a tool.
- **Supabase production RLS state could not be verified** — the linked project isn't accessible from this account (M-7 remains conditional).
- **Prompt injection (M-8) was analyzed statically**, not exploited end-to-end against the live model.
- Findings are **point-in-time** against commit `f771ada` with the stack running in `development` mode.

*Report generated by automated 3-pass review (static code analysis ×2 agents, pip-audit/npm audit, 12 active probes). All probe side effects cleaned up and verified.*
