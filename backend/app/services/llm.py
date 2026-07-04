"""LLM completion via Ollama (Qwen3)."""
from __future__ import annotations

from typing import AsyncIterator

import httpx

from app.core.config import get_settings


async def generate(prompt: str, system: str | None = None) -> str:
    """Generate a completion from the configured Ollama model."""
    settings = get_settings()
    payload: dict = {
        "model": settings.llm_model,
        "prompt": prompt,
        "stream": False,
    }
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(base_url=settings.ollama_url, timeout=180) as client:
        resp = await client.post("/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()


async def generate_stream(
    prompt: str, system: str | None = None
) -> AsyncIterator[str]:
    """Stream tokens from the configured Ollama model."""
    settings = get_settings()
    payload: dict = {
        "model": settings.llm_model,
        "prompt": prompt,
        "stream": True,
    }
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(base_url=settings.ollama_url, timeout=180) as client:
        async with client.stream("POST", "/api/generate", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    import json
                    chunk = json.loads(line)
                    token = chunk.get("response", "")
                    if token:
                        yield token
                except Exception:  # noqa: BLE001
                    continue
