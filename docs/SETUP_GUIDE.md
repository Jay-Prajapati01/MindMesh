# MindMesh — Complete Setup & Run Guide

> **What is MindMesh?**
> An AI-powered Personal Knowledge Operating System. Save YouTube videos, PDFs, documents, audio, Instagram reels, and web articles into one place — then search, chat, and discover connections across all your knowledge using AI.

---

## Table of Contents

1. [What You Need Before Starting](#1-what-you-need-before-starting)
2. [Install Prerequisites](#2-install-prerequisites)
3. [Download / Clone the Project](#3-download--clone-the-project)
4. [Project Folder Overview](#4-project-folder-overview)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Start Ollama (AI Models)](#6-start-ollama-ai-models)
7. [Pull AI Models](#7-pull-ai-models)
8. [Start Everything with Docker](#8-start-everything-with-docker)
9. [Verify All Services Are Running](#9-verify-all-services-are-running)
10. [Using the Frontend Dashboard](#10-using-the-frontend-dashboard)
11. [Adding Your First Content](#11-adding-your-first-content)
12. [Using Semantic Search](#12-using-semantic-search)
13. [Using AI Chat](#13-using-ai-chat)
14. [Browser Extension (Optional)](#14-browser-extension-optional)
15. [Useful Docker Commands](#15-useful-docker-commands)
16. [Troubleshooting](#16-troubleshooting)
17. [API Reference](#17-api-reference)

---

## 1. What You Need Before Starting

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 16 GB | 32 GB+ |
| Free Disk | 10 GB | 20 GB+ |
| OS | Windows 10/11, macOS, or Linux | Any |
| Docker | Docker Desktop installed & running | Latest version |
| Internet | Required for first setup (downloads models + dependencies) | — |

> **Important:** Close other heavy applications (Chrome tabs, video editors, etc.) during first setup. The AI models need memory.

---

## 2. Install Prerequisites

### Step 2.1 — Install Docker Desktop

1. Go to **https://docs.docker.com/desktop/install/windows-install/**
2. Click **"Download for Windows"**
3. Run the downloaded installer
4. Follow the installer prompts (keep all defaults checked)
5. When installation finishes, **restart your computer**
6. After restart, open **Docker Desktop** from the Start Menu
7. Wait until you see the green **"Engine running"** status in the bottom-left corner

> **How to verify Docker is running:**
> - Look for the Docker whale icon in your system tray (bottom-right of taskbar)
> - If it's there and not showing any error badges, Docker is running

### Step 2.2 — Install Ollama (AI Model Runner)

Ollama runs the AI models locally on your machine.

1. Go to **https://ollama.com/download/windows**
2. Click **"Download"**
3. Run the installer
4. Follow the prompts (keep defaults)
5. After installation, Ollama starts automatically

> **How to verify Ollama is running:**
> - Look for the Ollama icon (small llama) in your system tray
> - Or open PowerShell/CMD and type: `ollama --version`
> - You should see a version number like `ollama version 0.6.2`

### Step 2.3 — Install Git (if not already installed)

1. Go to **https://git-scm.com/download/win**
2. Click **"Download"** and run the installer
3. Keep all defaults during installation

> **How to verify Git is installed:**
> - Open PowerShell and type: `git --version`
> - You should see something like `git version 2.47.0.windows.1`

---

## 3. Download / Clone the Project

### Option A — Clone from GitLab (if you have access)

Open **PowerShell** and run:

```powershell
cd C:\Users\jay19
git clone <your-gitlab-repo-url> mindmesh-main
cd mindmesh-main
```

### Option B — If you already have the project folder

Just navigate to it:

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
```

> **Verify you're in the right folder:** Type `dir` (Windows) or `ls` (Mac/Linux) and you should see `docker-compose.yml`, `backend/`, `frontend/`, and `extension/` folders.

---

## 4. Project Folder Overview

```
mindmesh-main/
├── docker-compose.yml    ← This file orchestrates all services
├── backend/              ← Python API server (AI, search, ingestion)
│   ├── Dockerfile
│   ├── .env              ← Backend environment config (CREATE THIS)
│   ├── .env.example      ← Template for .env
│   ├── requirements.txt
│   └── app/              ← Python application code
├── frontend/             ← Next.js web dashboard
│   ├── Dockerfile
│   ├── package.json
│   └── app/              ← React pages and components
└── extension/            ← Browser extension (optional)
    ├── manifest.json
    ├── popup.html
    └── popup.js
```

---

## 5. Configure Environment Variables

The backend needs a `.env` file with configuration. A template already exists.

### Step 5.1 — Create the .env file

Open **PowerShell** and run:

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
copy backend\.env.example backend\.env
```

> On **macOS/Linux** use: `cp backend/.env.example backend/.env`

### Step 5.2 — Open and Review the .env file

Open `backend/.env` in any text editor (Notepad, VS Code, etc.):

```ini
# App
APP_NAME=MindMesh
ENVIRONMENT=development
LOG_LEVEL=INFO
API_PREFIX=/api
CORS_ORIGINS=http://localhost:3000
DATA_DIR=/app/data

# Qdrant (Vector Database)
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=mindmesh

# Ollama (AI Models) — connects to Ollama on your host machine
OLLAMA_URL=http://host.docker.internal:11434
LLM_MODEL=qwen2.5:3b
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIM=768

# Ingestion Settings
CHUNK_SIZE=800
CHUNK_OVERLAP=120
TOP_K=5
```

> **Key settings explained:**
> - `OLLAMA_URL=http://host.docker.internal:11434` — This tells Docker to reach Ollama running on YOUR computer (not inside Docker)
> - `LLM_MODEL=qwen2.5:3b` — The AI brain model (small, runs on CPU)
> - `EMBEDDING_MODEL=nomic-embed-text` — Converts text to vectors for search
> - `EMBEDDING_DIM=768` — Vector size (must match the embedding model)

### Step 5.3 — (Optional) Enable Instagram Support

If you want to save Instagram posts, uncomment and fill in these lines at the bottom of `backend/.env`:

```ini
IG_USERNAME=your_instagram_username
IG_PASSWORD=your_instagram_password
```

> Without this, Instagram ingestion will not work. YouTube, PDF, documents, audio, and web do NOT need this.

---

## 6. Start Ollama (AI Models)

Ollama must be running on your HOST machine before starting Docker.

### Step 6.1 — Make Sure Ollama Is Running

1. Check your system tray (bottom-right corner of screen)
2. Look for the **Ollama icon** (a small llama face)
3. If it's NOT there, open **Ollama** from the Start Menu

### Step 6.2 — Verify Ollama Is Responding

Open **PowerShell** and type:

```powershell
curl http://localhost:11434
```

You should see: `Ollama is running`

> If you get an error, Ollama is not running. Open it from Start Menu and wait 10 seconds, then try again.

---

## 7. Pull AI Models

These are the AI models MindMesh uses. You only need to do this **once**.

### Step 7.1 — Pull the Language Model (for chat, summaries, etc.)

Open **PowerShell** and run:

```powershell
ollama pull qwen2.5:3b
```

Wait for the download to complete. You'll see a progress bar like:

```
pulling manifest
pulling 6a0746a1ec1a... 100% ▕████████████████████████████████████████▏ 2.0 GB
success
```

> This model is ~2 GB. Download time depends on your internet speed.

### Step 7.2 — Pull the Embedding Model (for search)

```powershell
ollama pull nomic-embed-text
```

> This model is ~274 MB. Much smaller and faster.

### Step 7.3 — Verify Models Are Installed

```powershell
ollama list
```

You should see:

```
NAME                  ID            SIZE      MODIFIED
qwen2.5:3b            <some-id>    2.0 GB    X minutes ago
nomic-embed-text       <some-id>    274 MB    X minutes ago
```

---

## 8. Start Everything with Docker

This is the main command that starts all three services.

### Step 8.1 — Open Terminal in Project Folder

Open **PowerShell** and navigate to the project:

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
```

### Step 8.2 — Build and Start All Services

```powershell
docker compose up --build
```

> **What this does:**
> 1. Builds the frontend container (installs Node.js dependencies)
> 2. Builds the backend container (installs Python dependencies, Playwright, etc.)
> 3. Pulls the Qdrant vector database image
> 4. Starts all three services

**You will see output like:**

```
[+] Building 45.2s (21/21) FINISHED
[+] Running 3/3
 ✔ Container mindmesh-qdrant     Running
 ✔ Container mindmesh-backend    Started
 ✔ Container mindmesh-frontend   Started
```

> **First time build takes 2-5 minutes.** Subsequent starts are much faster (~10 seconds).

### Step 8.3 — Wait for "Ready" Messages

Watch the terminal output. When you see these messages, everything is ready:

```
mindmesh-frontend  |  ✓ Ready in 3.2s
mindmesh-backend   |  INFO:     Uvicorn running on http://0.0.0.0:8000
```

> **Keep this terminal open!** Closing it stops all services.

### Alternative: Run in Background

If you want to use the terminal for other things:

```powershell
docker compose up --build -d
```

The `-d` flag runs everything in the background. To see logs:

```powershell
docker compose logs -f
```

To stop background services:

```powershell
docker compose down
```

---

## 9. Verify All Services Are Running

### Step 9.1 — Check Container Status

Open a **new** PowerShell window and run:

```powershell
docker ps
```

You should see three containers running:

```
NAMES               IMAGE                    PORTS                           STATUS
mindmesh-frontend   mindmesh-main-frontend   0.0.0.0:3000->3000/tcp          Up X minutes
mindmesh-backend    mindmesh-main-backend    0.0.0.0:8000->8000/tcp          Up X minutes
mindmesh-qdrant     qdrant/qdrant:latest     0.0.0.0:6333-6334->6333-6334/tcp Up X minutes
```

### Step 9.2 — Test Each Service

Open your web browser and visit these URLs:

| Service | URL | What You Should See |
|---------|-----|---------------------|
| **Frontend Dashboard** | http://localhost:3000 | Dark-themed dashboard with "Good morning/afternoon/evening" greeting |
| **Backend API Docs** | http://localhost:8000/docs | Swagger UI with all API endpoints listed |
| **Backend Health** | http://localhost:8000/health | `{"status":"healthy"}` |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | Qdrant web interface |

> If any URL doesn't load, check the [Troubleshooting](#16-troubleshooting) section.

---

## 10. Using the Frontend Dashboard

Open **http://localhost:3000** in your browser.

### Dashboard Overview

When you first open MindMesh, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 MindMesh                                                │
│                                                             │
│  ┌──────┐  ┌─────────────────────────────────────────────┐  │
│  │ Home │  │  Good morning, Jay 👋                        │  │
│  │ ...  │  │  Your personal intelligence operating system │  │
│  │      │  │                                              │  │
│  │      │  │  [Search your knowledge...]     [Add Source] │  │
│  │      │  └─────────────────────────────────────────────┘  │
│  │      │                                                   │
│  │      │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │      │  │Chunks│ │Source│ │Qdrant│ │ AI   │            │
│  │      │  │  63  │ │  7   │ │Online│ │Online│            │
│  │      │  └──────┘ └──────┘ └──────┘ └──────┘            │
│  │      │                                                   │
│  │      │  ┌──────┐ ┌──────┐ ┌──────┐                     │
│  │      │  │Recent│ │Search│ │Quest-│                     │
│  │      │  │Sources│ │History│ │ions │                     │
│  │      │  └──────┘ └──────┘ └──────┘                     │
│  └──────┘                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Navigation (Left Sidebar)

Click any item in the left sidebar to go to that page:

| Sidebar Item | Page | What It Does |
|-------------|------|--------------|
| **Dashboard** | Home | Overview of your knowledge base |
| **Workspace** | Workspace | AI-powered workspace for notes and organization |
| **YouTube** | YouTube | Save YouTube videos |
| **Instagram** | Instagram | Save Instagram reels/posts |
| **PDF** | PDF | Upload PDF documents |
| **Documents** | Documents | Upload DOCX, PPTX, XLSX, Markdown files |
| **Audio** | Audio | Upload audio files for transcription |
| **Web** | Web | Save web articles by URL |
| **Graph** | Graph | Visual knowledge graph of all connections |
| **Timeline** | Timeline | Chronological view of all content |
| **Compare** | Compare | Compare two sources side by side |
| **Search** | Search | Semantic search across all knowledge |
| **Ask AI** | Chat | Chat with your knowledge base |
| **Stored** | Stored | Browse all saved sources |
| **Settings** | Settings | App configuration |

---

## 11. Adding Your First Content

### Option A — Save a YouTube Video

1. Click **"YouTube"** in the left sidebar
2. Paste a YouTube video URL into the input field, for example:
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
3. Click the **"Process"** or **"Add"** button
4. Wait for the processing to complete (you'll see a progress indicator)
5. The video is now indexed in your knowledge base!

### Option B — Upload a PDF

1. Click **"PDF"** in the left sidebar
2. Click the upload area or drag and drop a PDF file
3. Wait for extraction and indexing to complete
4. The PDF text is now searchable!

### Option C — Save a Web Article

1. Click **"Web"** in the left sidebar
2. Paste a URL of any article, blog post, or web page
3. Click **"Process"**
4. The article content is extracted and indexed!

### Option D — Upload a Document

1. Click **"Documents"** in the left sidebar
2. Upload a `.docx`, `.pptx`, `.xlsx`, or `.md` file
3. Wait for processing

### Option E — Upload Audio

1. Click **"Audio"** in the left sidebar
2. Upload an audio file (`.mp3`, `.wav`, `.m4a`, etc.)
3. The audio is transcribed using Whisper AI and indexed

---

## 12. Using Semantic Search

1. Click **"Search"** in the left sidebar
2. You'll see the premium search interface with:
   - A large search bar with purple accent
   - Source filter chips (All, YouTube, Instagram, PDF, etc.)
   - Suggested searches when no query is entered
3. Type a question or topic, for example:
   ```
   What are the key points about machine learning?
   ```
4. Press **Enter** or click the **Search** button
5. Results appear as rich cards showing:
   - Relevance score (color-coded: green = high, yellow = medium, red = low)
   - Source type badge (YouTube, PDF, etc.)
   - AI-generated summary
   - Matching text snippet with highlighting
   - Entity tags and topics
   - Thumbnail (for videos)
6. Click **"More"** on any card to expand the full transcript
7. Use the **Intelligence Sidebar** (right panel) to see:
   - Coverage stats
   - Source distribution chart
   - Related topics
   - Search insights

---

## 13. Using AI Chat

1. Click **"Ask AI"** in the left sidebar
2. Type a question about your knowledge, for example:
   ```
   Summarize everything I've saved about AI agents
   ```
3. Press **Enter**
4. The AI will:
   - Search your knowledge base for relevant chunks
   - Generate an answer using the retrieved context
   - Show citations linking back to the original sources
5. Ask follow-up questions to dive deeper

---

## 14. Browser Extension (Optional)

The MindMesh Clipper browser extension lets you save any web page with one click.

### Step 14.1 — Load the Extension (Chrome/Edge)

1. Open **Chrome** or **Edge** browser
2. Type `chrome://extensions` in the address bar (Chrome) or `edge://extensions` (Edge)
3. Turn on **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button (top-left)
5. Navigate to `J:\Mindmesh by gitlab\mindmesh-main\extension`
6. Select the `extension` folder and click **"Select Folder"**
7. The "MindMesh Clipper" extension appears in your extensions list

### Step 14.2 — Configure the Extension

1. Click the **puzzle piece icon** 🧩 in your browser toolbar
2. Click **"MindMesh Clipper"**
3. In the popup, verify the Backend URL is set to:
   ```
   http://localhost:8000
   ```
4. Click **Save**

### Step 14.3 — Save Any Page

1. Navigate to any article or web page you want to save
2. Click the **MindMesh Clipper** icon in your toolbar
3. Click **"Save"**
4. The page is sent to MindMesh and indexed automatically

---

## 15. Useful Docker Commands

### Start Services

```powershell
# Start everything (foreground — you see all logs)
docker compose up --build

# Start everything (background — runs silently)
docker compose up --build -d

# Start only the frontend
docker compose up --build frontend

# Start only the backend
docker compose up --build backend
```

### Stop Services

```powershell
# Stop all services
docker compose down

# Stop and delete all data (fresh start)
docker compose down -v
```

### View Logs

```powershell
# See all logs (follow mode)
docker compose logs -f

# See only backend logs
docker compose logs -f backend

# See only frontend logs
docker compose logs -f frontend

# See last 50 lines of backend logs
docker compose logs --tail 50 backend
```

### Restart a Single Service

```powershell
# Restart only the backend
docker compose restart backend

# Restart only the frontend
docker compose restart frontend
```

### Check Container Status

```powershell
# See running containers
docker ps

# See all containers (including stopped)
docker ps -a
```

### Enter a Container (for debugging)

```powershell
# Open a shell inside the backend container
docker compose exec backend bash

# Open a shell inside the frontend container
docker compose exec frontend sh
```

### Rebuild from Scratch

If something is broken and you want a completely fresh start:

```powershell
docker compose down -v
docker system prune -f
docker compose up --build
```

---

## 16. Troubleshooting

### Problem: "Port 3000 already in use"

Another application is using port 3000. Find and stop it:

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with the number shown above)
taskkill /PID <PID> /F
```

### Problem: "Port 8000 already in use"

Same as above, but for port 8000:

```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Problem: "Backend can't connect to Ollama"

1. Make sure Ollama is running (check system tray for llama icon)
2. Test Ollama directly: `curl http://localhost:11434`
3. You should see: `Ollama is running`
4. If not, open Ollama from Start Menu

### Problem: "No AI responses / Chat not working"

1. Make sure you pulled the AI models:
   ```powershell
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ```
2. Check that models are installed: `ollama list`
3. Check backend logs: `docker compose logs backend`

### Problem: "Search returns no results"

This is normal if you haven't added any content yet. Add some content first (YouTube videos, PDFs, etc.) and then search.

### Problem: "Frontend shows old UI / no changes visible"

The frontend container needs to be rebuilt when code changes:

```powershell
docker compose up --build frontend
```

Or restart the container:

```powershell
docker compose restart frontend
```

### Problem: "Docker build fails"

1. Make sure Docker Desktop is running (green "Engine running" status)
2. Make sure you have enough disk space (at least 5 GB free)
3. Try a clean build:
   ```powershell
   docker compose down -v
   docker system prune -f
   docker compose up --build
   ```

### Problem: "Embedding dimension mismatch"

If you changed `EMBEDDING_DIM` in `.env` after already indexing content:

1. Stop Docker: `docker compose down -v`
2. The `-v` flag deletes the Qdrant data volume
3. Restart: `docker compose up --build`
4. Re-add your content

### Problem: "Instagram processing fails"

Instagram requires authentication. Add your credentials to `backend/.env`:

```ini
IG_USERNAME=your_username
IG_PASSWORD=your_password
```

Then restart: `docker compose restart backend`

---

## 17. API Reference

The backend provides a REST API. Full interactive docs are at:

> **http://localhost:8000/docs** (Swagger UI)

### Key Endpoints

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| `GET` | `/health` | Check if backend is alive |
| `GET` | `/api/stats` | Dashboard statistics (chunks, sources, recent activity) |
| `POST` | `/api/search` | Semantic search across all knowledge |
| `POST` | `/api/chat` | AI chat with RAG (retrieval-augmented generation) |
| `POST` | `/api/videos/process` | Ingest a YouTube video |
| `POST` | `/api/instagram/process` | Ingest an Instagram post |
| `POST` | `/api/pdf/process` | Upload and ingest a PDF |
| `POST` | `/api/documents/process` | Upload and ingest a document |
| `POST` | `/api/audio/process` | Upload and ingest audio |
| `POST` | `/api/web/process` | Ingest a web page by URL |
| `GET` | `/api/graph` | Get knowledge graph data |
| `GET` | `/api/timeline` | Get timeline of all sources |
| `POST` | `/api/compare` | Compare two sources |
| `GET` | `/api/sources` | List all ingested sources |
| `GET` | `/api/notes` | List workspace notes |
| `POST` | `/api/notes` | Create a note |

### Example: Search via API

```powershell
curl -X POST http://localhost:8000/api/search `
  -H "Content-Type: application/json" `
  -d '{"query": "machine learning", "source_type": null}'
```

### Example: Chat via API

```powershell
curl -X POST http://localhost:8000/api/chat `
  -H "Content-Type: application/json" `
  -d '{"question": "What have I saved about AI agents?"}'
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────┐
│  MINDMESH QUICK REFERENCE                            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Start:    docker compose up --build                 │
│  Stop:     docker compose down                       │
│  Fresh:    docker compose down -v && up --build      │
│  Logs:     docker compose logs -f                    │
│                                                      │
│  Dashboard:   http://localhost:3000                  │
│  API Docs:    http://localhost:8000/docs             │
│  Health:      http://localhost:8000/health           │
│  Qdrant:      http://localhost:6333/dashboard        │
│                                                      │
│  AI Models:                                           │
│    LLM:       qwen2.5:3b                             │
│    Embedding: nomic-embed-text                       │
│    Managed by: Ollama (run on host machine)          │
│                                                      │
│  Tech Stack:                                         │
│    Frontend:  Next.js 15 + TypeScript + Tailwind     │
│    Backend:   FastAPI + Python 3.11                   │
│    Vector DB: Qdrant                                 │
│    AI:        Ollama + Qwen2.5 + nomic-embed         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 18. Daily Use — Stop & Start (Data Safe)

> Everything is already set up. You just need these commands to stop and start your website.
> All your data (videos, PDFs, documents, search history, etc.) is stored in Docker volumes
> and will NOT be deleted when you stop.

### Where to Type These Commands

- **Windows:** Open **PowerShell** or **CMD** (search "PowerShell" in Start Menu)
- **Mac/Linux:** Open **Terminal**

Every command below is typed in that terminal. Press **Enter** after each one.

---

### STOP the Website (Keep All Data)

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
docker compose stop
```

That's it. Your website is now offline. All your data is safe inside Docker volumes.

> `docker compose stop` — stops containers but does NOT delete anything.
> Your data lives in Docker volumes (`qdrant_storage`, `backend_data`) which survive stops and restarts.

---

### START the Website Back (All Data Still There)

**Step 1:** Make sure Docker Desktop is running (green "Engine running" in system tray)

**Step 2:** Make sure Ollama is running (llama icon in system tray)

**Step 3:** Open PowerShell and type:

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
docker compose start
```

**Step 4:** Wait 5-10 seconds, then open your browser and go to:

```
http://localhost:3000
```

Your dashboard is back with all your data exactly as you left it.

---

### If `docker compose start` Doesn't Work

Sometimes Docker needs a full restart. Use this instead:

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
docker compose up -d
```

> `-d` means "run in background" so you can close the terminal.

---

### Complete Daily Routine (Copy-Paste Ready)

**To start your day:**

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
docker compose up -d
```

Wait 10 seconds, then open http://localhost:3000

**To end your day:**

```powershell
cd "J:\Mindmesh by gitlab\mindmesh-main"
docker compose stop
```

Close the terminal. Your data is safe.

---

### What Gets Preserved vs What Gets Deleted

| Action | Your Data | Containers | Notes |
|--------|-----------|------------|-------|
| `docker compose stop` | Saved | Stopped | Best for daily use. Everything preserved. |
| `docker compose start` | Restored | Running | Brings back everything as it was. |
| `docker compose down` | Saved | Removed | Containers removed but data volumes stay. |
| `docker compose down -v` | **DELETED** | Removed | Wipes ALL data. Only use for fresh start. |

> **Rule of thumb:** Never use `docker compose down -v` unless you want to erase everything and start from zero.

---

### One-Line Commands Cheat Sheet

| What You Want | Type This |
|---------------|-----------|
| Start website | `docker compose up -d` |
| Stop website (keep data) | `docker compose stop` |
| Restart website | `docker compose restart` |
| Check if running | `docker ps` |
| View logs | `docker compose logs -f` |
| Stop everything & delete data | `docker compose down -v` |
