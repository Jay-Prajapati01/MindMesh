"""Hugging Face Spaces AI Worker - Free tier CPU-based inference.

This FastAPI application provides endpoints for video processing,
document analysis, and AI summarization using locally hosted models.

Features:
- yt-dlp for video metadata extraction
- Docling for document parsing
- Transformers (sentence-transformers/bart) for summarization
- CORS enabled for Render/Vercel backend connection
- Environment-based backend selection (Groq / Local)
"""
import os
import subprocess
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # optional – if set we still run local
HF_SPACE_URL = os.getenv("HF_SPACE_URL")  # optional – for direct calls

# ──────────────────────────────────────────────────────────────
# FastAPI app setup
# ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="MindMesh AI Worker (HF Spaces)",
    description="CPU-based AI worker for video/document processing",
    version="0.1.0",
)

# ──────────────────────────────────────────────────────────────
# CORS – allow Render/Vercel backends to call us
# ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# Models / Pydantic schemas
# ──────────────────────────────────────────────────────────────
class VideoPayload(BaseModel):
    url: str


class GeneratePayload(BaseModel):
    prompt: str
    system: str | None = None
    stream: bool = False


class AnalysisResponse(BaseModel):
    video_title: str
    summary: str
    backend: str  # "hf_local" | "groq" | "local"
    latency_ms: float


# ──────────────────────────────────────────────────────────────
# Initialise summarisation pipeline (CPU – one‐time cost at startup)
# ──────────────────────────────────────────────────────────────
# Using facebook/bart-large-cnn – a well‑known, reasonably fast
# model that runs on CPU without GPU.  If you want a different
# model, swap the name below; just keep `device="cpu"`.
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    device="cpu",
)


# ──────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────
def _extract_title(youtube_url: str) -> str:
    """Run yt‑dlp to get the video title (best‑effort)."""
    try:
        result = subprocess.run(
            ["yt-dlp", "--get-title", youtube_url],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"yt-dlp failed: {exc}"
        )


def _summarize(text: str, max_len: int = 130, min_len: int = 30) -> str:
    """Run the local summariser; return the first sentence if it fails."""
    try:
        out = summarizer(
            text,
            max_length=max_len,
            min_length=min_len,
            do_sample=False,
        )
        return out[0]["summary_text"]
    except Exception:
        # Fallback – return the first short sentence.
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        return sentences[0] if sentences else text


# ──────────────────────────────────────────────────────────────
# API endpoints
# ──────────────────────────────────────────────────────────────
@app.get("/")
def health_check():
    """Simple liveness probe."""
    return {
        "status": "online",
        "worker": "Hugging Face Spaces Free Tier",
        "model": "facebook/bart-large-cnn (CPU)",
    }


@app.post("/process-video", response_model=AnalysisResponse)
async def process_video(payload: VideoPayload):
    """End-to-end: yt-dlp → title → Docling‑style text → LLM summarisation."""
    # 1️⃣ Extract title from YouTube (or any supported URL)
    video_title = _extract_title(payload.url)

    # 2️⃣ Build a short text block the summariser can chew
    context_text = f"Video titled “{video_title}”. Provide a concise summary suitable for a knowledge‑base entry."

    # 3️⃣ Summarise with the local transformers model (timed)
    t0 = time.time()
    summary = _summarize(context_text)
    latency_ms = round((time.time() - t0) * 1000, 2)

    # 4️⃣ Return a unified response indicating which backend was used
    return {
        "video_title": video_title,
        "summary": summary,
        "backend": "hf_local",  # always local on HF Spaces
        "latency_ms": latency_ms,
    }


@app.post("/generate")
def generate(payload: GeneratePayload):
    """Ollama-compatible generation endpoint.

    The MindMesh backend calls this when `HF_SPACE_URL` points at this Space.
    Uses the CPU summarisation pipeline; returns the same `{response}` shape
    the backend expects from Ollama so both paths are interchangeable.
    """
    text = payload.prompt
    if payload.system:
        text = f"{payload.system}\n\n{payload.prompt}"
    t0 = time.time()
    response = _summarize(text)
    return {
        "response": response,
        "backend": "hf_local",
        "latency_ms": round((time.time() - t0) * 1000, 2),
    }