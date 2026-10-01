# MindMesh — QA Report (TestSprite Cycle)

**Date:** 2026-10-01
**Scope:** Full end-to-end QA of the MindMesh stack (FastAPI backend · Next.js frontend · Qdrant · Ollama) — journeys, robustness, API contract, responsive layout, accessibility, resilience — followed by a fix loop.
**Environment:** Docker Compose (`localhost:3000` frontend, `localhost:8000` backend, `localhost:6333` Qdrant), 27 indexed sources, 198 chunks after cleanup.

---

## 1. Executive summary

| Phase | Area | Result |
|------:|------|--------|
| 1 | Route crawl / navigation | ✅ All 13 routes 200 with `h1`, unknown routes → proper 404 |
| 2 | Core journeys J1–J14 | ✅ 14/14 pass |
| 3 | Robustness & security probes | ✅ 27/27 pass |
| 4 | API contract + OpenAPI schema | ✅ 29/29 contract, 11/11 schema |
| 5 | Performance / responsive / a11y / resilience | ⚠️ issues found (see §4) |
| 6 | Fix loop | ✅ **11 bugs fixed, 0 open** |

**Final gate (all green):** `pytest 66 passed` · `qa_phase3 27/27` · `qa_contract 29/29` · `qa_schema 11/11` · `tsc --noEmit` 0 errors · `npm run lint` 0 errors · 0 horizontal overflow on any route at 375/768/1440/1920 · 0 unnamed interactive controls.

---

## 2. Journeys (Phase 2)

| # | Journey | Result | Notes |
|---|---------|--------|-------|
| J1 | YouTube ingest (`jNQXAC9IVRw`) | ✅ | 16.7s, 8 pipeline steps |
| J2 | PDF ingest (Docling E2E) | ✅ | 41.1s |
| J3 | Document ingest (`.md`) | ✅ | 6.6s |
| J4 | Web ingest (Wikipedia) | ✅ | 8.1s |
| J5 | Audio ingest (`.wav`) | ✅ | 14.0s |
| J6 | Instagram reel ingest | ✅ | 17.8s, dedupe works |
| J7 | Note create (Workspace) | ✅ | persisted via API |
| J8 | RAG chat with citations | ✅ | answer + 5 citations / 3 sources / 149ms |
| J9 | Semantic search (unique token) | ✅ | 5 chunks / 246ms, top hit correct |
| J10 | Cross-source compare | ✅ | custom dropdowns, CTA disabled until both selected, 12.7s |
| J11 | Knowledge graph | ✅ | 25 nodes rendered |
| J12 | Memory timeline | ✅ | chronological groups |
| J13 | Dashboard stats | ✅ | counts match API exactly |
| J14 | Settings persistence | ✅ | `topK` 5→8 persists in `mindmesh-store`, survives reload |

## 3. Robustness & contract (Phases 3–4)

- Path traversal (`../`, encoded) → 404/400, no file escape
- Missing fields → 422; malformed JSON → 422
- Corrupt PDF → graceful message ("Not a valid PDF file (missing %PDF-header)"), no orphan file left behind
- `.exe` upload rejected client-side; 120 MB PDF → 413 with visible UI message
- XSS payload stored raw but React-escaped (never injected)
- Double-click submit → exactly 1 stream request
- Source delete → full cascade (sources, chunks, stored file) verified
- Concurrency: 5 parallel ingests during a 10-query search burst — all 5 succeeded, worst search 2.09s, chat 4.9s
- 25-request burst, pagination (`page=2`), wrong HTTP methods → 405, trailing-slash behavior
- CORS: allowed origin reflected, foreign origin rejected (no `Access-Control-Allow-Origin`)
- OpenAPI schema conformance for every documented route: 11/11
- SSE stream contract: `data:`-only frames `{"type":"token"|"done"}` (matches the frontend parser)

## 4. Findings & fixes (Phases 5–6)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | MEDIUM | Empty/whitespace chat or search input returned arbitrary results and polluted `recent_questions` | Graceful 200 with `citations: []` / `hits: []`, no embedding call; >4000/1000 chars → 422 (`schemas.py`, `chat.py`, `search.py`) |
| 2 | MEDIUM | Horizontal overflow on `/chat`, `/search` (mobile), `/stored` (tablet) | Stacked columns below `lg`, `size={1}`+`min-w-0` inputs, wrapped headers/strip/timeline rows, hid icon clusters below `sm` |
| 3 | MEDIUM | Workspace notes were invisible to search | Plain-text note matching in `/api/search` (`source_type: "note"`, title 0.95 / body 0.85 / token 0.8), honors `source_type` filter; RAG unchanged |
| 4 | MED/LOW | Icon-only buttons and inputs without accessible names | `aria-label` / `aria-expanded` on notifications, settings, send/search/clear/mic/attach, file inputs, trash |
| 5 | LOW | Hotlink-blocked thumbnails (Instagram CDN 403) showed broken-image icons | New `ThumbImage` component with `onError` gradient fallback |
| 6 | LOW | Settings showed "Indexed chunks 0" while stats were loading | Shows `—` until data arrives |
| 7 | LOW | Failed chat request discarded the typed question | `onError` restores the failed question (verified by aborting the request in-browser) |
| 8 | LOW | Bare `/health` returned 404 | Alias added (skipped by the production rate limiter) |
| 9 | LOW | Top exact hits labelled "Low Match" | Score thresholds rebased to the embedding model's real distribution (≥0.55 High, ≥0.40 Medium) |
| 10 | MEDIUM* | Content-driven overflow once results/answers rendered (found in final verification) | Wrapping `ReasoningStrip` + `AITimeline` header, `break-words` titles, result thumbnails hidden below `sm` |
| 11 | LOW | Unlabelled hidden file input on `/pdf` | `aria-label` added |

*Severity as originally reported; reclassified during verification.*

### Test-fragility (not product bugs)
- `/api/ask`, `/api/embed` → 404: those endpoints never existed (real paths `/api/chat`).
- SSE named `event:` lines: contract is `data:`-only frames.
- CORS rejects foreign origins *and* omits the header — correct security behavior.
- No 429 in dev: rate limiting is intentionally production-only.

## 5. Performance & accessibility

- Warm page loads: 572–2228 ms; TTFB 148–1463 ms; search P95 well under 2 s after warm-up
- Every route: single `h1`, `lang="en"`, images with `alt`
- 0 unnamed buttons/links/inputs across all 13 routes (automated scan)
- 0 horizontal overflow at 375 / 768 / 1440 / 1920 px — tested both empty and with live search results and chat answers

## 6. Regression suite

```powershell
# Backend unit/API tests (66 cases)
docker compose exec -T backend pytest tests -q

# Full suite: pytest + 67 API/contract/schema checks
powershell -File scripts\qa\run_all.ps1
```

| Suite | Location | Checks |
|-------|----------|-------|
| Pytest | `backend/tests/` | 66 (incl. graceful-empty/oversized input, note search, note filter) |
| Robustness | `scripts/qa/qa_phase3.py` | 27 |
| Contract | `scripts/qa/qa_contract.py` | 29 |
| Schema | `scripts/qa/qa_schema.py` | 11 |

## 7. Cleanup

- Removed QA artifacts from the library (Docling E2E PDF, `qa_test_doc.md`, "Me at the zoo", 2 Wikipedia pages): 32 → 27 sources, 405 → 198 chunks
- Repository hygiene: `.playwright-mcp/` debug logs and `tsconfig.tsbuildinfo` untracked and gitignored; docs and screenshots moved to `docs/`; `LICENSE` added
