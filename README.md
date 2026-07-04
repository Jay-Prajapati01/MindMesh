# MindMesh

**AI Personal Knowledge Operating System** — capture, understand, organize, connect, and retrieve information from everything you consume digitally (YouTube, PDFs, documents, social, audio, web).

Instead of remembering *where* you saw something, you just ask MindMesh naturally.

## Quick Start

**Windows (PowerShell / CMD) with Docker Desktop:**

```bash
copy backend\.env.example backend\.env
docker compose up --build
```

(macOS / Linux: use `cp backend/.env.example backend/.env`.)

- Backend API docs: http://localhost:8000/docs
- Frontend dashboard: http://localhost:3000
- Qdrant dashboard: http://localhost:6333/dashboard

### Pull the AI models (first run only)

Default, low-RAM friendly models (recommended for 16 GB, CPU-only):

```bash
docker compose exec ollama ollama pull qwen2.5:3b
docker compose exec ollama ollama pull nomic-embed-text
```

High-end / GPU alternative (edit `backend/.env` first, see comments there):

```bash
docker compose exec ollama ollama pull qwen3:8b
docker compose exec ollama ollama pull bge-m3
```

### See the frontend only (no AI backend)

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000. Pages render immediately; data-driven
sections stay empty until the backend is running.

## System Requirements

- **Minimum (default models):** 16 GB RAM, Docker Desktop, ~6 GB free disk for
  models + images. Close other heavy apps; inference is CPU-bound and slow but
  works.
- **Recommended:** a machine with a dedicated GPU for `qwen3:8b`.

> Tip: In Docker Desktop → Settings → Resources, give Docker at least 8 GB of
> memory if possible.

## Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, React Query, Zustand, Axios, React Flow
**Backend:** FastAPI, Python, AsyncIO, Pydantic
**AI:** Ollama (Qwen2.5:3B default / Qwen3:8B optional), nomic-embed-text / BGE-M3 embeddings, Faster-Whisper, yt-dlp, youtube-transcript-api
**Data:** Qdrant (vectors), PostgreSQL + Redis (later)
**Infra:** Docker, Docker Compose, Nginx, GitLab CI/CD

## Development Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Foundation | Complete |
| 2 | YouTube Intelligence | Complete |
| 3 | Internal Dashboard | Complete |
| 4 | Instagram Intelligence | Complete |
| 5 | PDF Intelligence | Complete |
| 6 | Document Intelligence | Complete |
| 7 | Audio Intelligence | Complete |
| 8 | Web Intelligence | Complete |
| 9 | Browser Extension | Complete |
| 10 | Knowledge Graph | Complete |
| 11 | Unified AI Chat | Complete |
| 12 | Memory Timeline | Complete |
| 13 | Cross-Source Intelligence | Complete |
| 14 | AI Workspace | Complete |

## Repository Layout

```
backend/     FastAPI service (ingestion, embeddings, vector store, RAG, graph)
frontend/    Next.js 15 dashboard
extension/   MV3 browser clipper (one-click save)
docker-compose.yml
```
