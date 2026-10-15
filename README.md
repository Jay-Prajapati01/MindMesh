<div align="center">

<img src="MindMesh_logo.png" alt="MindMesh logo" width="112">

# MindMesh

**A personal knowledge workspace for everything you save.**

Capture videos, articles, documents, audio, and notes. Search your library, explore connected ideas, and ask questions with source citations.

[Features](#features) · [Architecture](#architecture) · [Get started](#getting-started) · [Development](#development) · [Security](#security) · [Contributing](CONTRIBUTING.md)

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![License](https://img.shields.io/badge/License-MIT-green.svg)

</div>

---

## About

MindMesh brings personal research into one searchable workspace. It ingests content from common formats and sources, indexes it for semantic retrieval, and uses retrieval-augmented generation (RAG) to answer questions against that library.

MindMesh is free and open-source software under the [MIT License](LICENSE). You can run it locally and configure your own model and service credentials. MindMesh does not include hosted infrastructure or a managed service.

## Features

- **Content capture:** YouTube, web pages, PDFs, documents, audio, Instagram, and notes.
- **Grounded answers:** Ask questions across saved sources and inspect citations.
- **Search and organization:** Semantic search, timelines, source filters, and knowledge graph views.
- **Processing updates:** Streaming progress for ingestion and chat.
- **Web and Android companion:** Next.js workspace plus an Android share companion.
- **Bring your own services:** Local Ollama inference by default, with optional integrations configured by each operator.

## Screenshots

| Workspace | Ask AI | Knowledge graph |
|---|---|---|
| ![MindMesh dashboard](docs/screenshots/dashboard.png) | ![MindMesh Ask AI](docs/screenshots/ask-ai.png) | ![MindMesh graph](docs/screenshots/graph.png) |

## Architecture

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS.
- **API:** FastAPI and Python 3.11+.
- **Vector search:** Qdrant.
- **Language models and embeddings:** Ollama locally; optional configured model APIs.
- **Accounts and workspace data:** Supabase integration is available for authentication and cloud-backed features. Bring your own Supabase project and keys.
- **Android companion:** Kotlin and Jetpack libraries.

The default Docker Compose setup runs the web frontend, API, and Qdrant locally. Ollama runs on the host machine. Optional integrations are part of the application source; the repository does not include AWS, Google Cloud, or other hosted deployment recipes.

## Getting started

### Requirements

- Docker Desktop or Docker Engine with Compose v2
- Ollama installed on the host
- A Supabase project for sign-in and account-based workspace access
- 16 GB RAM recommended for local AI models; more memory improves model performance

### 1. Clone and configure

```bash
git clone https://github.com/Jay-Prajapati01/MindMesh.git
cd MindMesh
cp backend/.env.example backend/.env
```

Create a Supabase project, then configure `backend/.env`:

1. Set `AUTH_ENABLED=true`.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from your project.
3. Set `SUPABASE_SERVICE_ROLE_KEY` only if you enable server-side features that require it. Never use this key in the frontend or commit it.

Create `frontend/.env.local` with the public project settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Only use keys from a Supabase project you control. Keep all real environment files out of Git.

### 2. Start Ollama and download models

Install and start [Ollama](https://ollama.com/download), then pull the default chat and embedding models:

```bash
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

The Compose configuration connects to Ollama at `http://ollama:11434`. If Ollama runs directly on your host, set `OLLAMA_URL` in `backend/.env` to the host address reachable from Docker (for Docker Desktop, `http://host.docker.internal:11434`).

### 3. Start MindMesh

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API is available at [http://localhost:8000](http://localhost:8000); interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

Stop the stack with `docker compose down`. Add `--volumes` only if you intend to remove local database and application data.

## Development

For local development without Docker, use Python 3.11+ for the API and Node.js 20+ for the frontend.

```bash
# API
cd backend
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
uvicorn app.main:app --reload

# In a second terminal, from the repository root:
cd frontend
npm ci
npm run dev
```

Keep Qdrant and Ollama running and configure the backend service URLs in `backend/.env`. For contributor expectations and pull request guidance, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Configuration

The committed `backend/.env.example` lists supported backend settings. The frontend reads public build/runtime settings from `frontend/.env.local`. Common settings include:

| Variable | Purpose |
|---|---|
| `QDRANT_URL` | Qdrant endpoint; defaults to the Compose service. |
| `OLLAMA_URL` | Ollama endpoint; defaults to the Docker Desktop host gateway for a host-installed Ollama instance. |
| `LLM_MODEL` | Chat model name. |
| `EMBEDDING_MODEL` | Embedding model; must match the vector dimension. |
| `AUTH_ENABLED` | Enables Supabase-backed authentication. |
| `SUPABASE_URL` | Supabase project URL for the backend. |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key for backend auth verification. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the browser client. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key used by the browser client. |

Do not put service-role keys, payment secrets, encryption keys, or private provider tokens in variables prefixed with `NEXT_PUBLIC_`.

## Repository layout

```text
backend/             FastAPI app, ingestion pipelines, services, and tests
frontend/            Next.js web application
android-companion/   Android share companion
supabase/            SQL schema and migrations for optional Supabase features
workers/             Optional asynchronous processing worker integrations
docs/                Architecture, setup, security, and QA documentation
scripts/             Local maintenance and QA helpers
.github/workflows/   Continuous integration
```

## Documentation

- [Setup guide](docs/SETUP_GUIDE.md)
- [Architecture plan](docs/MINDMESH_ARCHITECTURE_PLAN.md)
- [API schema](docs/openapi.json)
- [Security report](docs/SECURITY_REPORT.md)
- [QA report](docs/QA_REPORT.md)
- [Android companion guide](android-companion/README.md)

## Security

Please do not report security vulnerabilities in public issues. See [SECURITY.md](SECURITY.md) for responsible disclosure guidance. Before exposing an instance to other users, review authentication, network access, provider credentials, and data retention settings for your own environment.

## License

MindMesh is licensed under the [MIT License](LICENSE). The license permits use, modification, distribution, sublicensing, and sale, subject to preserving the copyright and license notice. Third-party packages, models, and external services remain subject to their own terms and licenses.

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
