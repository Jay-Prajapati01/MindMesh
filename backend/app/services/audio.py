"""Audio ingestion: transcribe uploaded audio with Faster-Whisper."""
from __future__ import annotations

import tempfile
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

SUPPORTED = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"}


def transcribe(data: bytes, filename: str) -> dict:
    """Transcribe audio bytes to text. Returns {title, text}."""
    lower = filename.lower()
    ext = "." + lower.rsplit(".", 1)[-1] if "." in lower else ""
    if ext not in SUPPORTED:
        raise ValueError(f"Unsupported audio type: {ext or filename}")

    from faster_whisper import WhisperModel

    with tempfile.NamedTemporaryFile(suffix=ext, delete=True) as tmp:
        tmp.write(data)
        tmp.flush()
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(tmp.name)
        text = " ".join(seg.text for seg in segments).strip()

    return {"title": Path(filename).stem, "text": text}
