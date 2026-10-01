# MindMesh Architecture Plan — Source-Linked Knowledge Platform

## Current State (What Exists Today)

### What Works
- 6 ingestion types: YouTube, Web, Instagram, PDF, Documents, Audio
- Qdrant vector store with embeddings (`nomic-embed-text`, 768-dim)
- Ollama LLM (`qwen2.5:3b`) for summaries, RAG answers, knowledge graph
- Knowledge graph (JSON file) with entity extraction
- SSE streaming for real-time processing UI
- Chat with RAG — semantic search → LLM answer with citations
- Frontend: 16 pages including dashboard, chat, search, graph, timeline, compare

### What's Missing
1. **No file persistence** — uploaded files are read into memory and discarded after text extraction. Originals are gone forever.
2. **No source links in answers** — Qdrant chunks have no URL. AI says "according to X" but can't link to it.
3. **No re-download** — user can't re-download or re-open the original file after processing.
4. **No cross-source linking** — answers don't show which specific resource the information came from.
5. **Chat is stateless** — no conversation history, each question is independent.
6. **Stats are fake** — confidence, embeddings scanned, search time are client-side random numbers.

---

## Target Architecture — Two-Layer Storage

```
┌─────────────────────────────────────────────────────────────┐
│                     MindMesh Platform                       │
├──────────────────────┬──────────────────────────────────────┤
│   Layer 1: Original  │   Layer 2: AI Knowledge             │
│   Resource Storage   │                                      │
│                      │                                      │
│   /app/data/files/   │   Qdrant (embeddings + chunks)      │
│   ├── pdf/           │   store.json (metadata)              │
│   ├── documents/     │   graph.json (knowledge graph)       │
│   ├── audio/         │   summaries, topics, entities        │
│   └── ...            │                                      │
│                      │                                      │
│   Permanent.         │   Searchable.                        │
│   Downloadable.      │   AI-queryable.                      │
│   Openable.          │   Linked to originals.               │
└──────────────────────┴──────────────────────────────────────┘
```

### Every Resource Gets Two Lives

| Life | Storage | Purpose |
|------|---------|---------|
| Original Asset | `/app/data/files/{type}/` | Preserve the file permanently |
| AI Representation | Qdrant + store.json + graph.json | Make it searchable and queryable |

---

## Plan by Feature

### Feature 1: Original Resource Storage

**Goal:** Store every uploaded file to disk so it can be re-downloaded, re-opened, and referenced in AI answers.

**Development Storage:** Local filesystem at `/app/data/files/`

**Production Storage (future):** Cloudflare R2 / MinIO / S3

#### Directory Structure

```
/app/data/
├── files/
│   ├── pdf/
│   │   ├── {source_id}.pdf
│   │   └── ...
│   ├── documents/
│   │   ├── {source_id}.docx
│   │   ├── {source_id}.pptx
│   │   ├── {source_id}.txt
│   │   └── ...
│   ├── audio/
│   │   ├── {source_id}.mp3
│   │   └── ...
│   └── thumbnails/
│       ├── {source_id}.jpg
│       └── ...
├── store.json
└── graph.json
```

#### What Gets Stored Per Source Type

| Source Type | Original File | URL | Thumbnail | Extra Metadata |
|-------------|:---:|:---:|:---:|---|
| **YouTube** | None (copyright) | Video URL | Video thumbnail | video_id, channel, duration, published_at |
| **Web** | None (link) | Page URL | Favicon/screenshot | title, description |
| **Instagram** | None (link) | Post URL | Post image | shortcode, owner |
| **PDF** | PDF file | `/api/sources/{id}/download` | First page thumbnail | page_count, author, file_size |
| **Document** | DOCX/PPTX/etc | `/api/sources/{id}/download` | N/A | file_size, mime_type |
| **Audio** | Audio file | `/api/sources/{id}/download` | Waveform/N/A | duration, file_size, mime_type |

#### Changes Required

**Backend:**

1. **New service: `backend/app/services/file_storage.py`**
   - `save_file(source_id, file_bytes, file_type) -> str` — saves to `/app/data/files/{type}/{source_id}.{ext}`
   - `get_file_path(source_id, file_type) -> Path | None` — returns path if exists
   - `get_file_url(source_id, file_type) -> str` — returns API URL for download
   - `delete_file(source_id, file_type) -> bool`
   - `get_thumbnail_path(source_id) -> Path | None`

2. **New API: `backend/app/api/sources.py`**
   - `GET /api/sources` — list all sources (already exists, extend)
   - `GET /api/sources/{source_id}` — get source detail with file info
   - `GET /api/sources/{source_id}/download` — serve original file
   - `GET /api/sources/{source_id}/thumbnail` — serve thumbnail
   - `DELETE /api/sources/{source_id}` — delete source + file + chunks + graph

3. **Update `SourceItem` schema:**
   ```python
   class SourceItem(BaseModel):
       source_id: str
       source_type: str
       title: str | None = None
       channel: str | None = None          # URL for web/youtube/instagram
       thumbnail: str | None = None         # URL or local path
       summary: str | None = None
       key_topics: list[str] = []
       chunks_indexed: int = 0
       created_at: datetime = Field(default_factory=_utcnow)
       # NEW fields:
       file_path: str | None = None         # relative path in /app/data/files/
       file_name: str | None = None         # original filename
       file_size: int | None = None         # bytes
       mime_type: str | None = None         # e.g. "application/pdf"
       page_count: int | None = None        # for PDFs
       duration: int | None = None          # for audio/video (seconds)
   ```

4. **Update each ingestion API to save files:**

   | API | File Saved | How |
   |-----|-----------|-----|
   | `pdf.py` | Original PDF | `file_storage.save_file(source_id, pdf_bytes, "pdf")` |
   | `documents.py` | Original DOCX/etc | `file_storage.save_file(source_id, file_bytes, "documents")` |
   | `audio.py` | Original audio | `file_storage.save_file(source_id, audio_bytes, "audio")` |
   | `youtube.py` | None (thumbnail only) | Store thumbnail URL, video URL in SourceItem |
   | `web.py` | None (URL only) | Store page URL in SourceItem.channel |
   | `instagram.py` | None (URL only) | Store post URL in SourceItem.channel |

5. **Update Docker:** Mount `backend_data` volume includes `files/` subdirectory.

---

### Feature 2: Source-Linked AI Answers

**Goal:** When AI answers a question, it includes clickable links to the original resources.

#### Changes Required

**Backend:**

6. **Update `schemas.py` — Add `url` to Citation:**
   ```python
   class Citation(BaseModel):
       source_id: str
       source_type: str
       title: str | None = None
       snippet: str
       url: str | None = None           # NEW: link to original resource
       thumbnail: str | None = None     # NEW: thumbnail for preview
   ```

7. **Update `rag.py` — Include URL in citations:**
   ```python
   # In answer() function, when building citations:
   for hit in hits:
       # Build URL based on source type
       url = None
       if hit.get("source_type") == "youtube":
           url = hit.get("channel") or f"https://youtube.com/watch?v={hit.get('source_id')}"
       elif hit.get("source_type") == "web":
           url = hit.get("channel")
       elif hit.get("source_type") == "instagram":
           url = hit.get("channel")
       elif hit.get("source_type") in ("pdf", "document", "audio"):
           url = f"/api/sources/{hit.get('source_id')}/download"

       citations.append(Citation(
           source_id=hit.get("source_id", ""),
           source_type=hit.get("source_type", "unknown"),
           title=hit.get("title"),
           snippet=text[:200],
           url=url,
           thumbnail=hit.get("thumbnail"),
       ))
   ```

8. **Update LLM system prompt in `rag.py`:**
   ```python
   _ANSWER_SYS = (
       "You are MindMesh, a personal knowledge assistant. "
       "Answer ONLY using the provided context. "
       "If the answer is not in the context, say you don't have that information. "
       "Be concise and accurate. "
       "IMPORTANT: When you reference information from a source, include a citation marker "
       "like [1], [2], etc. corresponding to the source number. "
       "Always include citation markers when referencing specific sources."
   )
   ```

9. **Update `vectorstore.py` — Store URL metadata in chunks:**

   For each source type, the chunk payload needs to include the `channel` field (which holds the URL) and optionally `thumbnail`. This means updating the chunk payloads at ingestion time (covered in Feature 3).

   Also update `search()` to return `channel` and `thumbnail` in results:
   ```python
   def search(...) -> list[dict]:
       # ... existing code ...
       return [{"score": r.score, **(r.payload or {})} for r in results]
       # This already returns all payload fields, so adding channel/thumbnail
       # to payloads at ingest time automatically makes them available at search time.
   ```

**Frontend:**

10. **Update `SourceReferenceCard.tsx` — Make clickable:**
    ```tsx
    // Instead of just displaying the card, wrap in <a> tag:
    <a
      href={citation.url || `/stored/${citation.source_id}`}
      target={citation.url?.startsWith("http") ? "_blank" : "_self"}
      rel="noopener noreferrer"
      className="block rounded-[16px] border ... hover:border-[#0EA5E9]/30 transition-all"
    >
      {/* existing card content */}
      {/* Add "Open Source" button */}
    </a>
    ```

11. **Update `AnswerCard.tsx` — Wire up InlineCitation:**
    - Parse answer text for `[1]`, `[2]` markers
    - Replace with `<InlineCitation>` components that show hover popups
    - Each popup shows source title, snippet, and "Open" link

12. **Update `ChatResponse.tsx` or equivalent — Show source links section:**
    - Below the AI answer, show a "Sources" section with all citations as clickable cards
    - Each card shows: source type icon, title, snippet, "Open Original" button

---

### Feature 3: Chunk Payload Enrichment

**Goal:** Every chunk in Qdrant carries enough metadata to link back to the original source.

#### Current vs Target Payload

**Current (all sources):**
```json
{
  "text": "chunk content...",
  "source_id": "abc123",
  "source_type": "youtube",
  "title": "Video Title",
  "chunk_index": 0
}
```

**Target (all sources):**
```json
{
  "text": "chunk content...",
  "source_id": "abc123",
  "source_type": "youtube",
  "title": "Video Title",
  "chunk_index": 0,
  "channel": "https://youtube.com/watch?v=abc123",
  "thumbnail": "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
  "file_path": null,
  "file_name": null
}
```

#### Changes Per Ingestion API

| API | Add to Payload |
|-----|---------------|
| `videos.py` | `channel` = video URL, `thumbnail` = thumbnail URL |
| `web.py` (api) | `channel` = page URL |
| `instagram.py` | `channel` = post URL, `thumbnail` = post image URL |
| `pdf.py` | `file_path` = relative path to stored PDF, `file_name` = original filename |
| `documents.py` | `file_path` = relative path to stored file, `file_name` = original filename |
| `audio.py` | `file_path` = relative path to stored audio, `file_name` = original filename |
| `ingest.py` (shared) | Accept optional `channel`, `thumbnail`, `file_path`, `file_name` params and include in payloads |

#### Important: Existing Chunks

Chunks already in Qdrant will NOT have the new fields. Options:
- **Option A (recommended):** Ignore — new ingestions get enriched chunks, old ones still work (just no links)
- **Option B:** Migration script — re-embed all chunks with new payloads (expensive, not recommended now)

---

### Feature 4: Stored Sources Page Enhancement

**Goal:** The `/stored` page shows all ingested sources with their original files, thumbnails, and actions.

#### Current State
- `/stored` page exists, lists sources from `store.json`
- Shows title, type badge, summary, created_at
- No thumbnails, no download buttons, no file links

#### Target State
- Each source card shows: thumbnail/icon, title, type, summary snippet, file size, created_at
- Actions: "Open in Chat" (links to chat with source filter), "Download Original", "View Summary", "Delete"
- Sources are filterable by type
- Sources are searchable

#### Changes Required

13. **Update `SourceItem` schema** (covered in #3 above)

14. **Update `frontend/app/stored/page.tsx`:**
    - Show thumbnails for sources that have them
    - Add download button per source
    - Add "Ask AI about this" button
    - Show file metadata (size, type, page count for PDFs)

15. **Update `backend/app/api/sources.py`:**
    - `GET /api/sources` — return enriched SourceItems with file info
    - Add download endpoint (covered in #2)

---

### Feature 5: Chat Improvements

**Goal:** Make chat responses richer and more useful.

#### 5a: Source-Linked Answers
Covered in Feature 2 above.

#### 5b: Conversation History (Multi-turn)
Currently each question is stateless. For true "second brain" experience, chat needs memory.

16. **New model: `ConversationMessage`**
    ```python
    class ConversationMessage(BaseModel):
        role: str  # "user" | "assistant"
        content: str
        citations: list[Citation] | None = None
        timestamp: datetime = Field(default_factory=_utcnow)
    ```

17. **Store conversations in `store.json` or new `conversations.json`**
    ```json
    {
      "conversations": [
        {
          "id": "conv_abc123",
          "title": "Auto-generated from first question",
          "messages": [...],
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    }
    ```

18. **Update `ChatRequest` schema:**
    ```python
    class ChatRequest(BaseModel):
        question: str
        conversation_id: str | None = None  # NEW
        top_k: int | None = None
        source_type: str | None = None
        source_id: str | None = None
    ```

19. **Update `rag.answer()` to accept conversation history:**
    - Include last N messages in the LLM prompt
    - Enable contextual follow-up questions

#### 5c: Streaming Chat Responses

20. **Add SSE streaming endpoint for chat:**
    ```python
    @router.post("/stream")
    async def chat_stream(payload: ChatRequest):
        # Same as answer() but streams tokens via SSE
    ```

21. **Update frontend to use SSE for chat** (like ingestion pages do)

---

### Feature 6: Search Enhancement

**Goal:** Search results include source links and metadata.

22. **Update `SearchHit` schema:**
    ```python
    class SearchHit(BaseModel):
        score: float
        text: str
        source_id: str
        source_type: str
        title: str | None = None
        url: str | None = None           # NEW
        thumbnail: str | None = None     # NEW
        channel: str | None = None       # NEW
        file_path: str | None = None     # NEW
    ```

23. **Update `frontend/app/search/page.tsx`:**
    - Show clickable links to source in search results
    - Show thumbnails
    - "Ask AI about this result" button

---

### Feature 7: Dashboard Enhancement

**Goal:** Dashboard shows real stats and links to sources.

24. **Update `StatsResponse` schema:**
    ```python
    class StatsResponse(BaseModel):
        indexed_chunks: int
        total_sources: int
        sources_by_type: dict[str, int]
        vector_store: str = "qdrant"
        total_files_stored: int = 0       # NEW
        total_storage_bytes: int = 0      # NEW
        recent_sources: list[SourceItem] = []
        recent_searches: list[RecentQuery] = []
        recent_questions: list[RecentQuery] = []
    ```

25. **Update `frontend/app/settings/page.tsx` or dashboard:**
    - Show real storage usage
    - Show file counts by type
    - Show real search metrics

---

## Implementation Order

### Phase 1: Source-Linked Answers (Core Feature)
**Priority: HIGH — This is what the user asked for.**

| Step | File | Change | Est. Effort |
|------|------|--------|-------------|
| 1 | `schemas.py` | Add `url`, `thumbnail` to `Citation`; extend `SourceItem` | Small |
| 2 | `ingest.py` | Accept `channel`, `thumbnail`, `file_path`, `file_name` in payloads | Small |
| 3 | `rag.py` | Build URLs from hit metadata, include in citations, update prompt | Medium |
| 4 | `videos.py` | Add `channel` + `thumbnail` to chunk payloads | Small |
| 5 | `web.py` (api) | Add `channel` to chunk payloads | Small |
| 6 | `instagram.py` | Add `channel` + `thumbnail` to chunk payloads | Small |
| 7 | `pdf.py` | Add `file_path` + `file_name` to chunk payloads | Small |
| 8 | `documents.py` | Add `file_path` + `file_name` to chunk payloads | Small |
| 9 | `audio.py` | Add `file_path` + `file_name` to chunk payloads | Small |
| 10 | `SourceReferenceCard.tsx` | Make cards clickable links | Small |
| 11 | `AnswerCard.tsx` | Wire up InlineCitation for [1][2] markers | Medium |
| 12 | `Citation` display | Add "Open Original" / "Download" buttons | Small |

### Phase 2: File Persistence
**Priority: HIGH — Required for PDF/Document/Audio downloads.**

| Step | File | Change | Est. Effort |
|------|------|--------|-------------|
| 13 | New: `file_storage.py` | Save/load/delete files from `/app/data/files/` | Medium |
| 14 | New: `sources.py` (api) | Download, thumbnail, detail endpoints | Medium |
| 15 | `pdf.py` | Save PDF to disk before processing | Small |
| 16 | `documents.py` | Save document to disk before processing | Small |
| 17 | `audio.py` | Save audio to disk before processing | Small |
| 18 | `docker-compose.yml` | Ensure volume mounts include files dir | Small |

### Phase 3: Chat Improvements
**Priority: MEDIUM — Better UX.**

| Step | File | Change | Est. Effort |
|------|------|--------|-------------|
| 19 | `schemas.py` | Add `ConversationMessage`, `conversation_id` to `ChatRequest` | Small |
| 20 | `store.py` | Store/retrieve conversations | Medium |
| 21 | `rag.py` | Accept conversation history, multi-turn context | Medium |
| 22 | `chat.py` (api) | Add streaming endpoint | Medium |
| 23 | Frontend chat | Update to use streaming + conversation history | Large |

### Phase 4: Stored Sources & Search Enhancement
**Priority: MEDIUM — Polish UX.**

| Step | File | Change | Est. Effort |
|------|------|--------|-------------|
| 24 | `stored/page.tsx` | Thumbnails, download buttons, file metadata | Medium |
| 25 | `SearchHit` schema | Add url, thumbnail, channel fields | Small |
| 26 | `search/page.tsx` | Clickable source links, thumbnails | Medium |
| 27 | Dashboard | Real stats, storage usage | Small |

---

## File Impact Summary

### Backend Files to Modify
| File | Changes |
|------|---------|
| `backend/app/models/schemas.py` | Extend Citation, SourceItem, SearchHit, ChatRequest, StatsResponse |
| `backend/app/services/ingest.py` | Add channel, thumbnail, file_path, file_name to chunk payloads |
| `backend/app/services/rag.py` | Build URLs in citations, update LLM prompt, add conversation history |
| `backend/app/services/store.py` | Add conversation storage, file metadata queries |
| `backend/app/api/videos.py` | Add channel + thumbnail to chunk payloads |
| `backend/app/api/web.py` | Add channel to chunk payloads |
| `backend/app/api/instagram.py` | Add channel + thumbnail to chunk payloads |
| `backend/app/api/pdf.py` | Save file to disk, add file_path to chunk payloads |
| `backend/app/api/documents.py` | Save file to disk, add file_path to chunk payloads |
| `backend/app/api/audio.py` | Save file to disk, add file_path to chunk payloads |
| `backend/app/api/chat.py` | Add streaming endpoint, conversation support |
| `backend/app/api/sources.py` | Extend with download, thumbnail, detail endpoints |

### Backend Files to Create
| File | Purpose |
|------|---------|
| `backend/app/services/file_storage.py` | File persistence service |

### Frontend Files to Modify
| File | Changes |
|------|---------|
| `frontend/components/chat/SourceReferenceCard.tsx` | Clickable links to sources |
| `frontend/components/chat/AnswerCard.tsx` | InlineCitation wiring, source link section |
| `frontend/components/chat/InlineCitation.tsx` | Already exists, wire it up |
| `frontend/app/stored/page.tsx` | Thumbnails, download, file metadata |
| `frontend/app/search/page.tsx` | Source links, thumbnails |
| `frontend/lib/api.ts` | Add new API calls |

---

## Data Flow Diagrams

### Ingestion Flow (Enhanced)

```
User Uploads PDF
        │
        ▼
┌───────────────────┐
│  Save Original     │ ──→ /app/data/files/pdf/{source_id}.pdf
│  to Disk           │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Extract Text      │ ──→ OCR / Text extraction
│  (existing)        │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Generate Summary  │ ──→ Ollama LLM
│  + Topics          │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Chunk Text        │ ──→ Sentence-aware chunking
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Create Embeddings │ ──→ nomic-embed-text
└───────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│  Upsert to Qdrant WITH enriched payload:      │
│  {                                             │
│    text, source_id, source_type, title,        │
│    chunk_index, section_heading,               │
│    file_path: "pdf/{source_id}.pdf",  ← NEW   │
│    file_name: "original.pdf",          ← NEW   │
│    thumbnail: null,                     ← NEW   │
│    channel: null                        ← NEW   │
│  }                                             │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────┐
│  Extract Graph     │ ──→ Knowledge graph triples
│  Relations         │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Store Metadata    │ ──→ store.json (SourceItem with file_path)
│  + Source Record   │
└───────────────────┘
```

### Search + Answer Flow (Enhanced)

```
User: "Explain CNNs from my notes"
        │
        ▼
┌───────────────────┐
│  Embed Question    │ ──→ nomic-embed-text
└───────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│  Search Qdrant                                │
│  Returns hits WITH:                           │
│  {text, source_id, source_type, title,        │
│   channel, thumbnail, file_path, ...}         │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│  Build Context + Citations                    │
│                                                │
│  For each hit:                                 │
│    - Add [title] text block to context         │
│    - Build Citation with URL:                  │
│      YouTube → https://youtube.com/watch?v=... │
│      Web     → https://example.com/article     │
│      PDF     → /api/sources/{id}/download      │
│      Audio   → /api/sources/{id}/download      │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│  LLM generates answer with [1] [2] markers    │
│  "CNNs are a type of neural network [1].       │
│   They use convolutional layers [2]..."        │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│  Return to Frontend:                          │
│  {                                             │
│    answer: "CNNs are... [1] [2]",              │
│    citations: [                                │
│      {                                         │
│        title: "Deep Learning PDF",             │
│        url: "/api/sources/abc/download",  ←─── │
│        snippet: "CNNs use convolutional...",   │
│        source_type: "pdf"                      │
│      },                                        │
│      {                                         │
│        title: "YouTube Video",                 │
│        url: "https://youtube.com/watch?v=xyz", │
│        snippet: "...",                         │
│        source_type: "youtube"                  │
│      }                                         │
│    ]                                           │
│  }                                             │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│  Frontend renders:                            │
│                                                │
│  Answer text with clickable [1] [2] markers   │
│                                                │
│  Sources:                                      │
│  ┌─────────────────────────────────────────┐  │
│  │ 📄 Deep Learning PDF                    │  │
│  │ "CNNs use convolutional..."             │  │
│  │ [Open PDF] [Download]                   │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ 🎥 CNN Explained (YouTube)              │  │
│  │ "Convolutional neural networks..."      │  │
│  │ [Watch Video]                           │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

---

## Storage Budget

### Development (Local Disk)

| Content | Avg Size | 100 Items | 1000 Items |
|---------|----------|-----------|------------|
| PDFs | 2 MB | 200 MB | 2 GB |
| Audio | 5 MB | 500 MB | 5 GB |
| Documents | 500 KB | 50 MB | 500 MB |
| Thumbnails | 50 KB | 5 MB | 50 MB |
| **Total** | | **~755 MB** | **~7.6 GB** |

### Production (Cloudflare R2)

| Item | Cost |
|------|------|
| Storage | $0.015/GB/month |
| PUT/POST requests | $5 per 10,000 |
| GET requests | $0.36 per 10,000 |
| Egress | **FREE** (R2 has no egress fees) |

---

## Migration Strategy

### For Existing Data
- No migration needed for existing chunks (they still work, just lack URL metadata)
- New ingestions automatically get enriched chunks
- Old sources in `store.json` get `file_path: null` (no original file to link to)
- Users can re-ingest sources to get enriched metadata

### For Future Storage Upgrade
- When moving to R2/S3, update `file_storage.py` backend only
- Frontend and API layer stay the same
- Config setting: `STORAGE_BACKEND=local` or `STORAGE_BACKEND=r2`

---

## Success Criteria

After implementation, the user should be able to:

1. **Upload a PDF** → original is stored on disk → AI answers reference it → user clicks "Open PDF" → downloads/opens the original
2. **Paste a YouTube URL** → AI answers include "Watch Video" link → user clicks → opens YouTube
3. **Paste a web article** → AI answers include "Open Article" link → user clicks → opens the page
4. **Upload audio** → AI answers reference it → user clicks "Play Audio" → downloads/plays the original
5. **Search** → results show source links and thumbnails → user can open/download originals
6. **Chat** → AI response has clickable citation markers [1] [2] → hover shows source → click opens it
7. **Stored Sources page** → all uploaded files visible with thumbnails → download/open/ask AI about any of them

This transforms MindMesh from "AI that summarizes" into "AI that remembers everything, including where it learned it."
