<div align="center">

<img src="MindMesh_logo.png" alt="MindMesh logo" width="130">

# **MindMesh**

### *Your buddy who remembers everything you save*

**Capture → Understand → Connect → Ask.**  
Stop remembering *where* you saw something — just ask MindMesh naturally.

![License](https://img.shields.io/badge/License-MIT-8A2BE2?style=flat-square&logo=opensourceinitiative&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-DC2626?style=flat-square&logo=qdrant&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

![GitHub issues](https://img.shields.io/github/issues/Jay-Prajapati01/MindMesh?style=flat-square&color=E1306C)
![GitHub stars](https://img.shields.io/github/stars/Jay-Prajapati01/MindMesh?style=flat-square&color=F59E0B)
![Last commit](https://img.shields.io/github/last-commit/Jay-Prajapati01/MindMesh?style=flat-square&color=22C55E)

<br/>

<img src="docs/screenshots/dashboard.png" alt="MindMesh Dashboard" width="88%">

<br/>

**[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [🏗 Architecture](#-architecture) · [📦 API](#-api-overview) · [🧪 QA Report](docs/QA_REPORT.md)**

</div>

---

<div align="center">

> ### 🧩 *“Everything you watch, read, hear and save, unified into one brain you can talk to.”*

</div>

---

## 📑 Table of Contents

<details>
<summary><b>Click to expand</b></summary>

1. [✨ Why MindMesh](#-why-mindmesh)
2. [🎯 Features](#-features)
3. [🖼️ Screenshots](#️-screenshots)
4. [🏗 Architecture](#-architecture)
5. [🧰 Tech Stack](#-tech-stack)
6. [🚀 Quick Start](#-quick-start)
7. [🧪 Development & Testing](#-development--testing)
8. [📦 API Overview](#-api-overview)
9. [🗂 Repository Structure](#-repository-structure)
10. [⚙️ Configuration](#-configuration)
11. [📚 Documentation](#-documentation)
12. [🤝 Contributing](#-contributing)
13. [📄 License & Author](#-license--author)

</details>

---

## ✨ Why MindMesh

<table>
<tr>
<td align="center" width="33%">

### 😵 The Problem
YouTube videos, PDFs, reels, articles, lectures, notes — scattered everywhere. Finding that *one thing* you saw last week is impossible.

</td>
<td align="center" width="34%">

### 🧠 The MindMesh Way
Ingest anything — **video, audio, PDF, doc, web, social** — and ask questions in plain English. Answers come back **grounded with citations** from *your* content.

</td>
<td align="center" width="33%">

### 🚀 The Result
A **private, self-hosted second brain**: semantic search, knowledge graphs, timelines, and cross-source comparisons — all running locally with **your** data.

</td>
</tr>
</table>

**🌟 Highlights**

| | |
|---|---|
| 🗣️ **Grounded Ask AI** | Answers only from *your* content — with citations, mic & file uploads |
| 🕸️ **Hybrid RAG** | Dense + sparse + graph retrieval fused with **RRF** |
| 🧠 **GraphRAG** | Entity/relation extraction → knowledge graph → community summaries |
| ⚡ **Streaming UX** | SSE live ingestion progress + token-streamed chat |
| 🛡️ **Type-safe** | End-to-end **TypeScript** + **Pydantic v2** validation |
| 🧩 **Extensible** | Plugin-style ingestion pipelines |
| 🏭 **Production-ready** | Docker, health checks, structured logging, CI/CD |

---

## 🎯 Features

<table>
<tr>
<td width="50%">

| | Feature | What it does |
|---|---------|--------------|
| 🎥 | **YouTube Intelligence** | Transcribe, summarize, chapterize & chat with any video |
| 📄 | **PDF Intelligence** | Multi-stage pipeline: extract → clean → chunk → embed → graph |
| 🎙️ | **Audio Intelligence** | Whisper transcription + speaker diarization + summarization |
| 📸 | **Instagram Intelligence** | Download posts/reels/stories, captions, OCR, embeddings |
| 🌐 | **Web Intelligence** | Crawl, extract, summarize and index any webpage |
| 📚 | **Document Intelligence** | PDF, DOCX, TXT, MD, EPUB — one universal processor |

</td>
<td width="50%">

| | Feature | What it does |
|---|---------|--------------|
| 🗣️ | **Grounded Ask AI** | Context-only answers with citations — refuses to guess, voice input + file uploads |
| 🕸️ | **Knowledge Graph** | Auto-extracted entities & relations, interactive React Flow viz |
| ⏰ | **Memory Timeline** | Chronological view of everything you've ingested |
| 🔀 | **Cross-Source Intel** | Compare, contrast & synthesize across multiple sources |
| 🤖 | **AI Workspace** | Persistent threads, follow-ups, source filters |
| 🧩 | **Browser Extension** | MV3 one-click clipper for instant capture |
| 🔔 | **Real-time Processing** | SSE live pipeline updates with progress tracking |
| 🌓 | **Light & Dark** | One-click theme toggle across the whole app |

</td>
</tr>
</table>

---

## 🖼️ Screenshots

| 🌙 Landing — Dark | 💡 Landing — Light |
|---|---|
| ![Landing dark](docs/screenshots/landing-dark.png) | ![Landing light](docs/screenshots/landing-light.png) |
| 💬 Ask AI — Dark | 🕸️ Knowledge Graph |
| ![Ask AI](docs/screenshots/ask-ai.png) | ![Knowledge graph](docs/screenshots/graph.png) |

---

## 🏗 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│   Ollama    │
│  (Next.js)  │     │  (FastAPI)  │     │   (LLM)     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌──────────┐ ┌───────────┐
         │  Qdrant │ │PostgreSQL│ │   Redis   │
         │(Vectors)│ │(Relational)│ │(Cache/Queue)│
         └─────────┘ └──────────┘ └───────────┘
```

**Ingestion pipelines:** `🎥 YouTube · 📄 PDF · 🎙️ Audio · 📸 Instagram · 🌐 Web · 📚 Documents`  
→ chunk → embed → index → graph-extract → **ask anything**.

---

## 🧰 Tech Stack

| Layer | 🛠 Technology |
|-------|--------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, React Query, Zustand, Axios, React Flow, Framer Motion, Lenis, Three.js |
| **Backend** | FastAPI, Python 3.11+, AsyncIO, Pydantic v2 |
| **AI / ML** | Ollama (Qwen2.5 / Qwen3), nomic-embed-text / BGE-M3, Faster-Whisper, yt-dlp |
| **Vector DB** | Qdrant (HNSW, payload filtering) |
| **Relational DB** | PostgreSQL (asyncpg, SQLAlchemy 2.0) |
| **Cache / Queue** | Redis (BullMQ-style) |
| **Contact form** | Supabase (Postgres, publishable key) |
| **Infra** | Docker, Docker Compose, Nginx, GitLab CI/CD |
| **Extension** | Manifest V3, TypeScript, Webpack |

---

## 🚀 Quick Start

### ✅ Prerequisites
- 🐳 **Docker Desktop** (≥ 8 GB RAM allocated)
- 📦 **Git**

### 🪟 Windows (PowerShell)

```powershell
git clone https://github.com/Jay-Prajapati01/MindMesh.git
cd MindMesh
copy backend\.env.example backend\.env
docker compose up --build
```

### 🍎 macOS / 🐧 Linux

```bash
git clone https://github.com/Jay-Prajapati01/MindMesh.git
cd MindMesh
cp backend/.env.example backend/.env
docker compose up --build
```

### 🤖 First Run — Pull AI Models

```bash
# Default (16 GB RAM, CPU-friendly)
docker compose exec ollama ollama pull qwen2.5:3b
docker compose exec ollama ollama pull nomic-embed-text

# High-end / GPU (edit backend/.env first)
docker compose exec ollama ollama pull qwen3:8b
docker compose exec ollama ollama pull bge-m3
```

### 🌐 Access Points

| Service | URL |
|---------|-----|
| 🎛️ Frontend Dashboard | http://localhost:3000 |
| 📚 API Docs (Swagger) | http://localhost:8000/docs |
| 🔍 Qdrant Dashboard | http://localhost:6333/dashboard |
| 📊 Grafana *(if enabled)* | http://localhost:3001 |

---

## 🧪 Development & Testing

<details>
<summary><b>🖥️ Frontend only (with mock data)</b></summary>

```bash
cd frontend
npm install
npm run dev
# Opens http://localhost:3000
```

</details>

<details>
<summary><b>🧪 Full regression suite</b></summary>

```powershell
# Backend unit/API tests — 66 cases
docker compose exec -T backend pytest tests -q

# Everything: pytest + 67 API / contract / schema checks
powershell -File scripts\qa\run_all.ps1
```

</details>

> 📋 Full QA history, journeys and fixed findings: **[docs/QA_REPORT.md](docs/QA_REPORT.md)**

---

## 📦 API Overview

| Module | Endpoints |
|--------|-----------|
| 💬 **Chat** | `POST /api/chat`, `GET /api/chat/history` |
| 🎥 **YouTube** | `POST /api/youtube/ingest`, `GET /api/youtube/{id}` |
| 📄 **PDF** | `POST /api/pdf/ingest`, `POST /api/pdf/batch` |
| 📸 **Instagram** | `POST /api/instagram/ingest` |
| 📚 **Documents** | `POST /api/documents/ingest` |
| 🎙️ **Audio** | `POST /api/audio/ingest` |
| 🌐 **Web** | `POST /api/web/ingest` |
| 🔍 **Search** | `POST /api/search`, `POST /api/search/hybrid` |
| 🕸️ **Graph** | `GET /api/graph`, `GET /api/graph/nodes/{id}` |
| ⏰ **Timeline** | `GET /api/timeline` |
| 📊 **Stats** | `GET /api/stats` |

> 📖 Interactive docs: **http://localhost:8000/docs**

---

## 🗂 Repository Structure

```
MindMesh/
├── backend/              ⚙️  FastAPI service
│   ├── app/
│   │   ├── api/          REST endpoints (14+ routers)
│   │   ├── core/         Config, logging, security
│   │   ├── models/       Pydantic schemas
│   │   └── services/     Business logic (RAG, Graph, Ingestion)
│   ├── tests/            Pytest suite (66 tests)
│   └── requirements.txt
├── frontend/             🎨 Next.js 15 Dashboard
│   ├── app/              App Router pages
│   ├── components/       60+ reusable components
│   ├── hooks/            Custom React hooks
│   └── lib/              API client, utilities
├── extension/            🧩 MV3 Browser Extension
├── scripts/qa/           🧪 Regression suite (run_all.ps1)
├── docs/                 📚 Architecture, setup guide, QA report, screenshots
├── docker-compose.yml    🐳 Full stack orchestration
└── .gitlab-ci.yml        🔄 CI/CD pipeline
```

---

## ⚙️ Configuration

Edit **`backend/.env`**:

| Category | Variables |
|----------|-----------|
| 🤖 Models | `OLLAMA_MODEL`, `EMBEDDING_MODEL` |
| ✂️ Chunking | `CHUNK_SIZE`, `CHUNK_OVERLAP` |
| 🕸️ Graph | `ENTITY_EXTRACTION_ENABLED`, `RELATION_EXTRACTION_ENABLED` |
| 🗣️ Chat grounding | `CHAT_MIN_SCORE` (minimum retrieval score before answering) |
| 🌐 Frontend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| 🔑 API Keys | YouTube, Instagram, etc. |

---

## 📚 Documentation

| 📄 Document | Description |
|-------------|-------------|
| [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Installation, configuration, first run |
| [MINDMESH_ARCHITECTURE_PLAN.md](docs/MINDMESH_ARCHITECTURE_PLAN.md) | System design, data flow, pipelines |
| [QA_REPORT.md](docs/QA_REPORT.md) | 🧪 Full QA report — journeys, findings, fixes, regression suite |
| [scripts/qa/](scripts/qa/) | Runnable regression checks |

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! 🚀

1. 🍴 Fork the repository
2. 🌿 Create your feature branch — `git checkout -b feature/amazing-feature`
3. ✅ Run the regression suite — `powershell -File scripts\qa\run_all.ps1`
4. 💾 Commit your changes — `git commit -m 'Add amazing feature'`
5. 📤 Push to the branch — `git push origin feature/amazing-feature`
6. 🔀 Open a **Pull Request**

> 🐛 Found a bug? Open an [issue](https://github.com/Jay-Prajapati01/MindMesh/issues).

---

## 📄 License & Author

Released under the [MIT License](LICENSE). ✅

<br>

<div align="center">

**👨‍💻 Jay Prajapati**
[@Jay-Prajapati01](https://github.com/Jay-Prajapati01)

<br/>

⭐ **If MindMesh helps you, consider giving it a star!** ⭐

</div>
