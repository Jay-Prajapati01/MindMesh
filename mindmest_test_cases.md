# MindMesh: complete AI-driven test cases

> **Status:** Test plan only. No tests were run while preparing this file. This is based on the current codebase, not a claim that any feature passes. Execute only in a disposable test environment with synthetic data. Never point destructive, load, or cross-tenant cases at production.

## 1. How the AI test agent should use this file

1. Inspect the current implementation and record the commit SHA, frontend/backend versions, environment, execution mode (`local` or `modal`), browser/device matrix, and enabled integrations. Reconcile route or API changes with this plan before execution; retain IDs in the result report.
2. Provision isolated test infrastructure and synthetic fixtures. Use automated browser tests for UI controls, direct API clients for contracts, controlled service stubs for failure paths, and disposable Supabase/Redis/Qdrant/Modal resources for integration cases. Do not use live personal accounts, third-party content, or production secrets.
3. Run each relevant case with at least the stated action and oracle. Capture sanitized request/response, browser trace/screenshot, job transitions, database/storage/vector evidence, and correlation IDs. The AI must inspect the resulting evidence, not mark a case passed merely because a command returned zero.
4. Record `PASS`, `FAIL`, `BLOCKED` (environment or unavailable dependency), `NOT_IMPLEMENTED` (the expected capability is absent), or `NOT_APPLICABLE` (document why). Never count blocked or unimplemented cases as passes. For each failure, record reproducible steps, expected/actual behavior, severity, owner, evidence link, and suspected code location.
5. Execute against both local and cloud modes where indicated. A local pass never substitutes for a Modal pass. Use separate tenant accounts and data stores. The cloud lane must have no dependency on a developer laptop, local Ollama, Windows path, or local GPU.
6. Avoid logging tokens, service-role keys, document contents, or private URLs in artifacts. Redact secrets before publishing the report. Do not infer security from UI behavior alone; inspect server and persisted data.

**Case notation:** `UI` browser; `API` HTTP; `INT` integrations; `SEC` security; `OPS` reliability/operations; `PERF` load; `ACC` accessibility. Every row is an independent test. “Expected” describes the desired behavior; if code lacks it, report `NOT_IMPLEMENTED` or `FAIL`, not a fabricated pass. For each page below, add empty, loading, successful, invalid-input, backend-error, refresh, back/forward, narrow/mobile viewport, keyboard-only, and browser-reload variants to its listed controls.

## 2. Automated fixture and environment contract

| Fixture | Required setup and purpose |
|---|---|
| Identities | `A1` and `A2` belong to tenant A; `B1` belongs only to tenant B; `N1` has no active membership; unauthenticated visitor. Use distinct Supabase Auth users and independently seeded memberships. |
| Tenant data | Seed distinctive markers `A_ONLY_SYNTHETIC` and `B_ONLY_SYNTHETIC` in sources, chunks, graph, notes, chat and jobs. Seed overlapping source titles to expose missing ownership filters. |
| Sources | Valid and malformed YouTube, Instagram and web URLs; transcript-present and transcript-absent video; text PDF, scanned PDF, malformed PDF; DOCX, PPTX, XLSX, CSV, TXT, Markdown; short/long/multilingual audio; one duplicate of each; at least 25 sources for pagination; Unicode and long titles. Use generated or licensed synthetic fixtures. |
| Controlled services | Stub external sites, transcript service, yt-dlp, Crawl4AI/Playwright, Instaloader, storage, Qdrant, Redis and inference failures where feasible. A small separate sandbox integration lane can exercise real providers and Modal. |
| Failure injection | Timeouts, 429, 5xx, connection loss, corrupt media, model unavailable, Redis restart, worker crash, expired signed URL, insufficient storage, Qdrant unavailable, and delayed/out-of-order responses. |
| Isolation evidence | Before/after snapshots of tenant A/B database rows, storage objects, Qdrant points, job keys and audit logs. Use unique run IDs and clean them up automatically after evidence is captured. |

Run configuration lanes: `L0` deterministic unit/component with mocks; `L1` local full stack; `C1` cloud staging with Modal and private cloud services; `C2` controlled failure/load. Tests requiring an external account should be `BLOCKED` when that sandbox is unavailable, with the missing dependency named.

## 3. Route, navigation and shared UI

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| UI-001 | L1/C1 | Visit `/`, `/contact`, `/dashboard`, `/workspace`, `/youtube`, `/instagram`, `/pdf`, `/documents`, `/audio`, `/web`, `/graph`, `/timeline`, `/compare`, `/search`, `/chat`, `/stored`, `/settings`, `/source/{id}` directly and via navigation. | Each route loads the right page; protected routes enforce the auth mode; no broken navigation, hydration error, uncaught exception, or blank screen. |
| UI-002 | L1/C1 | Click logo/home, every desktop nav link, active item, dashboard action card, and browser back/forward. | URL, active nav state, page title and view agree; history behaves correctly. |
| UI-003 | L1/C1 | Open/close mobile drawer; activate every item with touch and keyboard; resize at phone/tablet/desktop widths. | Drawer traps/frees focus appropriately, closes after navigation, and no content/control is clipped. |
| UI-004 | L1/C1 | Toggle light/dark theme and refresh; change accent, density and animations in Settings; open a new tab. | Visual preferences persist and apply consistently; controls have clear selected state. |
| UI-005 | L1/C1 | Trigger invalid route, missing source ID and injected API failure. | Not-found/error/loading views render useful recovery actions; no internal trace or secret leaks. |
| UI-006 | L1/C1 | Open dashboard command palette with button and shortcut; type, select, Escape and click outside. | Matching commands route correctly; keyboard selection and close behavior work. |
| UI-007 | L1/C1 | Open dashboard “Add source” menu and click each ingestion destination. | Menu opens/closes and every item reaches the intended route. |
| UI-008 | L1/C1 | Open notification center, select notification, mark all read, clear all, dismiss toast. | Counts, read state, links and dismissals are coherent after refresh. |
| UI-009 | L1/C1 | Start jobs, use background-task panel/banner actions, navigate away and return. | Correct jobs and states appear; navigation works; removing a banner does not silently cancel a server job. |
| UI-010 | L1/C1 | Inspect dashboard stats/charts/live status with empty and seeded data; activate refresh/actions. | Values agree with scoped APIs and update without stale cross-tenant information. |
| UI-011 | L1/C1 | Use landing “Start Building Free”, “See How it Works”, nav/footer links and copy-command button. | Each control has a real destination/action and clipboard content is accurate; placeholder links are flagged. |
| UI-012 | L1/C1 | Fill Contact name/email/company/topic/message; submit valid, empty, malformed and duplicate entries. | Validation is clear; submission produces the intended persisted/delivered outcome or is marked unimplemented; no silent success. |

## 4. Authentication, identity and tenancy

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| SEC-001 | C1 | Open protected routes and call every private API without bearer token, with malformed, expired and wrong-project tokens. | Denied consistently; no data or job created. |
| SEC-002 | C1 | Sign in with valid/invalid credentials, refresh, close/reopen tab, sign out; repeat concurrent tab/session behavior. | Session state is correct; sign-out revokes access to private views and cached data. |
| SEC-003 | C1 | Sign in as `N1` without active membership. | All tenant operations are rejected; no default or client-selected tenant is inferred. |
| SEC-004 | C1 | As `A1`, submit tenant B IDs in URL, body, headers, job payload, resource ID and source links for every endpoint. | Server resolves tenant from authenticated membership and rejects/ignores forged ownership. No B read or write. |
| SEC-005 | C1 | Have `A1` create data, `A2` access same-tenant allowed data, and `B1` try all corresponding API and UI routes. | Membership policy is applied deliberately; B cannot list, view, download, search, chat over, change or delete A data. |
| SEC-006 | C1 | Switch identities in one browser without hard reload while queries/jobs are cached. | Previous tenant’s dashboard, search, notes, jobs, source previews and chats disappear immediately. |
| SEC-007 | C1 | Replay job ID, storage path, signed URL and source ID from A as B. | No cross-tenant job status, cancel, file bytes, metadata, vector or graph access. |
| SEC-008 | C1 | Inspect browser bundle/network/local storage and public API responses. | Service-role, Modal, Qdrant and Redis credentials are absent; only public anon key may appear where appropriate. |
| SEC-009 | L1/C1 | Exercise local API-key settings if exposed; inspect auth selection in each mode. | Local-only key cannot bypass cloud membership or become a production auth path. |

## 5. Source ingestion forms and shared processing controls

Run `ING-001` through `ING-009` separately on YouTube, Instagram, PDF, Documents, Audio and Web where the control exists.

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| ING-001 | L1/C1 | Paste a valid URL or select a valid file; click Process once. | Validation succeeds; one scoped processing job/source is created; progress and result appear. |
| ING-002 | L1/C1 | Submit empty, malformed, unsupported scheme/domain/extension, oversize and corrupted input. | Specific validation error, no successful source/vector side effect, no leaked internals. |
| ING-003 | L1/C1 | Use URL clear button, file picker, drag/drop, keyboard file selection and replace selected file. | Input state and enabled/disabled Process state update correctly; file type/size guidance is accurate. |
| ING-004 | L1/C1 | Click Process rapidly twice; retry same input after refresh; submit same content through a second browser tab. | Duplicate work is controlled and source/chunk/point identity policy is explicit. |
| ING-005 | L1/C1 | Click Cancel while queued and while processing; close tab and reopen. | Queued cancellation persists; processing cancellation behavior is honest and documented; cancelled jobs never show completed success erroneously. |
| ING-006 | L1/C1 | Inspect ProcessingHeader, progress timeline expansion, status labels, toast and result section. | Stages match actual job state; terminal success/failure is displayed once; “Ask AI” opens relevant context. |
| ING-007 | L1/C1 | Force server/network timeout and reconnect during process and status polling/streaming. | UI resumes or shows actionable failure, without duplicate source or infinite spinner. |
| ING-008 | C1 | Upload as A, then attempt processing/result/storage access with B identifiers. | Input and output remain tenant-scoped end to end. |
| ING-009 | C1 | Inspect service errors and failure UI for corrupted input, transient provider failure and worker crash. | Error code/message/retryability are meaningful; stack, internal path and credentials remain hidden. |

### Format-specific ingestion

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| ING-010 | L1/C1 | YouTube video with available transcript, captions in another language, and no transcript. | Transcript-first path is used; Faster-Whisper runs only when transcript is unavailable; text/source metadata are accurate. |
| ING-011 | L1/C1 | YouTube shorts, watch/playlist URLs, redirects, unavailable/private/geo-blocked video and malicious URL. | Supported URLs normalize; unsupported/unavailable URLs fail clearly; SSRF protections remain effective. |
| ING-012 | L1/C1 | Instagram post/reel/carousel with caption, image text and video speech; induce Playwright failure. | Text, OCR and speech are handled per support policy; Instaloader fallback is exercised; unsupported/private content reports honestly. |
| ING-013 | L1/C1 | Text, scanned, table-heavy, rotated, image-only, password-protected and corrupted PDFs; force Docling error. | Docling extraction and OCR are used where needed; PyMuPDF fallback works when appropriate; structure/page citations stay traceable. |
| ING-014 | L1/C1 | DOCX, PPTX, XLSX, CSV, TXT, Markdown; include tables, Unicode, large files, formula cells and empty files. | Each supported format parses into useful ordered text/metadata; unsupported or empty data does not claim success. |
| ING-015 | L1/C1 | MP3/WAV/M4A/OGG/FLAC/AAC/WEBM, silence, long and multilingual speech; examine timestamps. | Supported audio transcribes via Faster-Whisper, failures are safe, and timestamps/chunks map to source. |
| ING-016 | L1/C1 | Static web article, JavaScript-rendered page, paginated content, redirect loop, robots/blocked response and encoding variants. | Crawl4AI/Playwright/httpx selection or fallback follows configured behavior; useful text and canonical URL are stored, failures are bounded. |
| ING-017 | L1/C1 | Compare original extracted text, normalized text, chunks, metadata and summary for each format. | No blank/duplicate chunks, excessive loss, incorrect order, or cross-source contamination; source citations remain reversible. |
| ING-018 | C1 | Upload file, inspect private storage object and signed download, then delete source. | Worker uses cloud storage rather than local machine path; cleanup/retention policy is explicit and enforced. |

## 6. Search, chat, compare and intelligence

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| AI-001 | L1/C1 | Search known text, misspelling, exact phrase, Unicode, empty string and no-result term; use clear, Enter and search button. | Query runs once, ranked results are relevant, empty/invalid states are clear, clear resets state. |
| AI-002 | L1/C1 | Click suggestion chips, source-type filters, result expand/open and “Ask AI”; toggle IntelligenceSidebar topics/“show all”. | Every control updates correct scoped data or route and has a useful empty state. |
| AI-003 | C1 | Query for `A_ONLY_SYNTHETIC` and `B_ONLY_SYNTHETIC` as both tenants; inspect Qdrant request filter. | Tenant filter is part of vector query before retrieval; B content never reaches A response or model context. |
| AI-004 | C1 | Compare BGE-M3 vector size/collection/configuration with legacy Nomic data; query both lanes. | BGE-M3 uses separate compatible collection and 1024-dimensional vectors; legacy points are not silently mixed. Reindex strategy is measurable. |
| AI-005 | L1/C1 | Ask a grounded question, out-of-corpus question, ambiguous question and follow-up; inspect answer/citations. | Grounded claims cite valid authorized source chunks; uncertainty is expressed when evidence is absent; conversation context behaves consistently. |
| AI-006 | L1/C1 | Exercise chat send button, Enter versus Shift+Enter, empty send, clear input, suggested prompts and follow-up chips. | Actions send exactly once or remain disabled; chat history and scroll/focus behavior are coherent. |
| AI-007 | L1/C1 | Use chat source filter chips, recent-question sidebar, “view all sources,” source cards and inline citations. | Filters constrain retrieval, references open correct authorized source, and no stale citation points to another tenant. |
| AI-008 | L1/C1 | Use Clear History, error Retry, attachment and voice controls; refresh/reopen chat. | UI and server state agree; controls either work or are marked `NOT_IMPLEMENTED`; retry does not duplicate messages. |
| AI-009 | C1 | Interrupt chat streaming, cancel/refresh, run simultaneous conversations; inject model failure. | Stream terminates cleanly, partial state is labeled, conversations do not cross, failure is sanitized. |
| AI-010 | L1/C1 | Compare two distinct sources; use both source selector search, clear, selection and Compare button. | Correct pair and comparison render; same-source, missing-source and deleted-source cases validate. |
| AI-011 | C1 | Inject answer text designed to instruct model/agent to reveal other tenant content or secrets. | Source text remains untrusted; retrieval/auth boundaries and response policy hold. |
| AI-012 | L1/C1 | Search and chat with no indexed sources, indexing still in progress and deleted source. | Correct empty/pending state; no stale source is cited or returned. |

## 7. Workspace, stored sources, source detail, graph and timeline

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| DATA-001 | L1/C1 | Use each Workspace tool card. | Every card reaches the intended functioning tool, including navigation on mobile. |
| DATA-002 | L1/C1 | Create note with title/body, Unicode, empty title, long body; delete note; refresh. | Validation, persistence, deletion and scoped note counts are correct. |
| DATA-003 | C1 | Try reading/deleting A note as B and changing owner in request payload. | No cross-tenant or forged-owner access. |
| DATA-004 | L1/C1 | On Stored page, click every type filter; open source, download source, view source detail and delete through confirmation; cancel deletion. | Filters/counts reflect data; links and bytes match selected source; cancel preserves; confirm removes only target. |
| DATA-005 | L1/C1 | Seed 25+ sources; use Previous/Next, first/last page, change filter mid-pagination, refresh. | No missing/duplicate rows; bounds and disabled button states are correct. |
| DATA-006 | C1 | Open `/source/{id}` for valid, missing and cross-tenant IDs; test signed URL expiry and direct download/view/link APIs. | Correct preview/metadata and secure access; missing/cross-tenant denied without revealing existence. |
| DATA-007 | L1/C1 | Graph: toggle each source-type chip, concept search/clear, fit-to-view, select node, close detail panel, use related-node and Ask AI actions. | Graph and detail synchronize; correct source/entity relationships and navigation appear. |
| DATA-008 | C1 | Fetch graph nodes/edges as A and B and inspect node details. | Every node/edge and related source is tenant-scoped; no orphan B edge is rendered for A. |
| DATA-009 | L1/C1 | Timeline: test empty state, multiple dates/time zones, filter/grouping/control actions present in the page, source navigation and update after ingestion/deletion. | Ordering, counts, time display and links match scoped persisted data. |
| DATA-010 | C1 | Delete an indexed source and inspect Supabase state, storage, Qdrant, graph, timeline, search and chat. | Defined deletion/retention policy is enforced consistently; no dangling user-visible results or unauthorized bytes. |

## 8. API and contract matrix

For every endpoint below, AI should also run missing/invalid auth, invalid schema, boundary size, nonexistent ID, cross-tenant ID, retry/duplicate, concurrent request, timeout and 5xx variants where meaningful. Assert HTTP status, response schema, content type, no secret leakage, persistent side effects and idempotency—not status code alone.

| ID | Endpoint or family | Required contract cases |
|---|---|---|
| API-001 | `GET /health`, `/api/health`, `/api/health/detailed` | Liveness versus dependency health, degraded dependency response, no sensitive details on public route. |
| API-002 | `GET /api/sources`, `GET /api/sources/{id}` | Tenant filter, ordering, pagination/filter semantics, missing ID, metadata completeness. |
| API-003 | `GET /api/sources/{id}/download`, `/view`, `/link` | Authorized bytes/MIME/filename, private signed URL TTL, cross-tenant denial, expiry. |
| API-004 | `DELETE /api/sources/{id}` | Ownership, repeated delete, partial downstream failure, storage/vector cleanup. |
| API-005 | `GET/POST/DELETE /api/notes` | Validation, persistence, ownership, repeated delete and concurrency. |
| API-006 | `GET /api/stats`, `/api/timeline`, `/api/graph` | Counts and entities agree with scoped database; empty and large graph behavior. |
| API-007 | `POST /api/search`, `/api/chat`, `/api/chat/stream`, conversation route | Query validation, streaming framing, auth, citations, rate limit and failure envelopes. |
| API-008 | `POST /api/compare` | Distinct authorized source IDs, same/missing/cross-tenant ID and result schema. |
| API-009 | `POST /api/videos|instagram|pdf|documents|audio|web/process` and `/process/stream` | Accepted inputs, content type, size caps, job creation, SSE job ID and malformed payloads. |
| API-010 | `GET/DELETE /api/jobs/{id}` | Owner-scoped status/cancel, allowed transitions, unknown ID, terminal result and retry fields. |
| API-011 | CORS, OPTIONS and error middleware | Only configured origins/methods/headers, no credential reflection, consistent redacted error body. |
| API-012 | Public API schema/OpenAPI | Every shipped endpoint/enum/request/response is documented and matches actual behavior; no dangerous debug endpoint. |

## 9. Modal jobs, models and persistence

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| JOB-001 | C1 | Submit each heavy operation and inspect API response, Redis job and Modal invocation. | FastAPI authenticates/resolves tenant, returns job handle promptly; expensive work executes in Modal. Browser never calls Modal directly. |
| JOB-002 | C1 | Trace job fields `job_id`, `tenant_id`, `user_id`, `resource_id`, type and payload through queue/worker/persistence. | Missing or forged scope is rejected before work; fields remain consistent and redacted in user-visible output. |
| JOB-003 | C1 | Observe queued → processing → completed/failed/cancelled and stream/poll UI for each job type. | State transitions are valid, monotonic, persisted and accurately reflected in UI. |
| JOB-004 | C2 | Crash worker after acquiring job; restart dispatcher; inject Redis timeout and lease expiry. | Bounded retry/recovery occurs without lost or duplicate final result; terminal failure is recorded. |
| JOB-005 | C2 | Cause temporary 429/5xx/network failure versus invalid/corrupt input. | Only retryable failures retry, at most configured attempts; permanent failures stop promptly with structured code/message. |
| JOB-006 | C2 | Dispatch same job twice and re-run a completed job. | Idempotent source, chunk, embedding, vector, graph and result writes; no duplicate points or records. |
| JOB-007 | C1 | Inspect Modal worker resource allocation and cold/warm invocation for Qwen3, BGE-M3, Whisper, document and ingestion. | Intended GPU jobs run on GPU, parsing/crawling on CPU, model weights reused/cached, user content not cached across tenants. |
| JOB-008 | C1 | Disconnect developer laptop and block local Ollama/local paths during cloud processing. | All production jobs still complete from cloud resources and private storage. |
| JOB-009 | C1 | Verify Supabase metadata, private Storage objects and Qdrant points after each ingestion. | Correct ownership payload, source/document/chunk IDs, vector dimension/model, and retrievability. |
| JOB-010 | C2 | Lose Qdrant or Supabase partway through an ingest. | Job does not claim completed with half-written inconsistent result; retry/repair path is safe. |
| JOB-011 | C1 | Inspect worker logs for job/user/tenant IDs, operation, status, duration and sanitized error; correlate end to end. | Useful structured diagnostics without tokens, service keys, raw private document text or internal stack in public response. |
| JOB-012 | C1 | Run concurrent A/B jobs using same model/container; compare outputs, temp files and caches. | Shared model weights are safe; no tenant data, file or context crosses requests; temp files are cleaned. |

## 10. Security and abuse resistance

| ID | Lane | AI action | Expected result |
|---|---|---|---|
| SEC-010 | L1/C1 | Send private, loopback, link-local, metadata-service and DNS-rebinding URLs through Web/YouTube/Instagram and redirects. | SSRF guard blocks every resolution/redirect stage; no internal service response is exposed. |
| SEC-011 | L1/C1 | Upload polyglot, wrong MIME/extension, zip-bomb-like, oversized and malformed files. | Safe rejection before expensive processing; bounded memory/CPU; no executable content or traversal extraction. |
| SEC-012 | C1 | Test API rate limits below/at/above configured window, multiple endpoints and concurrent clients; vary spoofed forwarding headers. | Intended per-identity/IP policy returns 429 and retry guidance; cannot bypass with forged headers or process hopping. Record gaps in distributed limits. |
| SEC-013 | C1 | Flood job creation and concurrent heavy requests within controlled staging limits. | Queue/concurrency quotas protect spend and fairness; no unbounded backlog or GPU storms. |
| SEC-014 | L1/C1 | Inject HTML/script into source title, note, transcript, chat, web crawl and notification. | Text is escaped in every rendered view; no script execution or unsafe URL navigation. |
| SEC-015 | C1 | Probe CORS, CSRF-relevant flows, cookies, security headers and authorization cache. | Browser-origin policy matches deployment; no cross-origin credential leak or stale privilege. |
| SEC-016 | C1 | Inspect committed/configured secrets, Modal Secret bindings, CI variables and logs without printing values. | No secret value in Git, image, browser or artifact; least-privilege server-side injection only. |
| SEC-017 | C1 | Enumerate IDs, request traversal paths, mutate content type and use oversized JSON/query bodies. | Bounded uniform failures and no unauthorized object existence disclosure. |
| SEC-018 | C1 | Test prompt injection in imported page/PDF/transcript and generated graph entity names. | Model output cannot perform unauthorized action or leak private context; source text is treated as data. |

## 11. Browser extension

| ID | Lane | AI action | Expected result |
|---|---|---|
| EXT-001 | L1/C1 | Load extension unpacked from current `extension` directory and open popup. | Manifest and popup JavaScript parse; controls render without console syntax error. |
| EXT-002 | L1 | Configure local API URL and send supported current-tab YouTube/web URL. | Correct target, request shape, result/progress or error is shown. |
| EXT-003 | C1 | Configure cloud API, sign in or provide supported auth, submit current tab and inspect 202 job lifecycle. | Extension has a secure auth path and follows async job; if absent, mark `NOT_IMPLEMENTED` rather than pass. |
| EXT-004 | L1/C1 | Use unsupported tab, invalid API URL, offline backend, closed popup/reopen and repeated click. | Validation and recovery are clear; no duplicate or unauthenticated processing. |
| EXT-005 | C1 | Inspect host permissions, CSP and stored settings. | Only necessary permissions; no production secret or service-role key in extension storage/package. |

## 12. Reliability, accessibility, performance and release gates

| ID | Lane | AI action | Expected result |
|---|---|---|
| OPS-001 | L1/C1 | Restart frontend/API/Redis/Qdrant during safe staged operations; reconnect client. | Recoverable jobs continue or fail cleanly; UI does not invent success; no lost ownership metadata. |
| OPS-002 | C1 | Test database migration/reindex on synthetic legacy Nomic collection and BGE-M3 target; resume interruption. | Migration is repeatable, dimension-safe and query cutover preserves expected recall; rollback path documented. |
| OPS-003 | C1 | Restore a synthetic backup of Supabase metadata/storage and Qdrant vectors into disposable environment. | Source references, vectors, jobs/notes and auth-scoped access are coherent after restore. |
| OPS-004 | C1 | Simulate expired storage URL, missing object, stale Redis job and model/image unavailable. | Actionable failure and bounded retry; no endless loading or silent data loss. |
| OPS-005 | L1/C1 | Inspect Docker local stack and production mode configuration via automation; launch only in a later authorized execution phase. | Production config rejects accidental local execution; local developer mode remains functional; required env is documented. |
| OPS-006 | C1 | Verify health/metrics/alert signals for queue depth, failed jobs, processing age, API latency, Modal errors and spend. | Actionable observable signals and thresholds exist; missing coverage is reported. |
| ACC-001 | L1/C1 | Keyboard-only journey across all pages, dialogs, dropdowns, forms, graph controls and extension popup. | Visible focus, logical order, Escape behavior and no keyboard trap. |
| ACC-002 | L1/C1 | Run automated accessibility scan plus focused semantic inspection of forms, icons, status messages and charts. | Meaningful labels, roles, errors, live status and contrast; violations logged by route/control. |
| ACC-003 | L1/C1 | Check 200% zoom, reduced motion, high contrast, screen-reader names and mobile viewport. | Main tasks remain usable and status/result content is discoverable. |
| PERF-001 | L1/C1 | Measure page load, route switch, search p50/p95, job-accept latency, ingest duration and time-to-first-chat-token on seeded fixtures. | Record baseline and budgets agreed for beta; regressions and cold-start spikes are visible. |
| PERF-002 | C2 | Controlled concurrent users across tenants: navigation, search/chat, uploads, queue jobs and downloads. | Error rate, latency, fairness, Redis/Qdrant/Modal saturation and cost remain within recorded beta budget. |
| PERF-003 | C2 | Submit large but allowed PDF/audio/document and long crawl with hard timeout/resource caps. | Bounded memory, storage, processing time and queue growth; oversized content is rejected early. |
| PERF-004 | C1 | Examine model cold/warm starts and repeated queries for unnecessary downloads or idle GPU containers. | Model cache reduces repeat cost; containers scale down when idle; no user-data cache bleed. |

## 13. Coverage and report required from the AI executor

The executor should maintain a route/control inventory extracted from the current DOM and compare it with Sections 3–7. For each visible button, input, link, menu item, dialog action, chip, card and keyboard shortcut, record its case ID and result. New controls discovered after this document was written get new IDs; no visible control may be silently omitted. Also report missing features and dead controls as findings.

Report each case as:

```text
Case ID | lane | build/commit | fixture/run ID | status | expected | actual |
evidence (sanitized trace/screenshot/API/log/state snapshot) | severity | owner | issue link
```

Report aggregate counts by route, feature and lane; list all `FAIL`, `BLOCKED`, `NOT_IMPLEMENTED` and omitted controls; separate product bugs from test-environment failures. Prioritize: **P0** cross-tenant leak, secret exposure, unbounded cloud spend or production data loss; **P1** broken primary ingestion/search/chat/auth or unsafe retries; **P2** incomplete UI behavior, accessibility, recovery and performance; **P3** cosmetic polish. A release candidate requires no P0/P1 failures, explicit disposition of blockers, and evidence from the cloud lane—not only mocks or local mode.

**Execution status at document creation: No tests were run.**
