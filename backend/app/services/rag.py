"""Retrieval-augmented generation: summaries, topics, and grounded answers."""
from __future__ import annotations

import json
from typing import AsyncIterator

from app.core.config import get_settings
from app.models.schemas import Citation
from app.services import embeddings, llm, store, vectorstore

_SUMMARY_SYS = (
    "You are a precise assistant that summarizes content. "
    "Return concise, factual summaries."
)

_ANSWER_SYS = (
    "You are MindMesh, a personal knowledge assistant. "
    "Answer ONLY using the provided context. "
    "If the answer is not in the context, say you don't have that information. "
    "Be concise and accurate. "
    "When you reference a source, include a citation marker like [1], [2] etc. "
    "corresponding to the source number in the SOURCES list. "
    "Always cite sources when referencing specific information."
)


def _lookup_source_metadata(source_id: str) -> dict:
    """Look up source metadata from store.json as fallback for old Qdrant chunks."""
    sources = store.list_sources()
    for s in sources:
        if s.get("source_id") == source_id:
            return s
    return {}


async def summarize(text: str) -> tuple[str, list[str]]:
    """Produce a summary and a list of key topics for the given text."""
    excerpt = text[:8000]
    prompt = (
        "Summarize the following content in 4-6 sentences, then list 5 key "
        "topics. Respond as JSON with keys 'summary' (string) and 'topics' "
        f"(array of strings).\n\nCONTENT:\n{excerpt}"
    )
    raw = await llm.generate(prompt, system=_SUMMARY_SYS)
    try:
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start : end + 1])
        return data.get("summary", "").strip(), list(data.get("topics", []))
    except (ValueError, json.JSONDecodeError):
        return raw.strip(), []


async def summarize_stream(
    text: str,
) -> AsyncIterator[str]:
    """Stream summary tokens from the LLM.

    Yields raw tokens as they arrive. The caller is responsible for
    assembling the final summary and extracting topics.
    """
    excerpt = text[:8000]
    prompt = (
        "Summarize the following content in 4-6 sentences, then list 5 key "
        "topics. Respond as JSON with keys 'summary' (string) and 'topics' "
        f"(array of strings).\n\nCONTENT:\n{excerpt}"
    )
    async for token in llm.generate_stream(prompt, system=_SUMMARY_SYS):
        yield token


async def answer(
    question: str,
    top_k: int | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
) -> tuple[str, list[Citation]]:
    """Retrieve relevant chunks and generate a grounded answer with citations."""
    settings = get_settings()
    top_k = top_k or settings.top_k

    query_vec = await embeddings.embed_text(question)
    hits = vectorstore.search(query_vec, top_k, source_type=source_type, source_id=source_id)

    if not hits:
        return (
            "I don't have any indexed knowledge yet. Add some content first.",
            [],
        )

    context_blocks, citations = [], []
    for idx, hit in enumerate(hits):
        title = hit.get("title") or hit.get("source_id", "unknown")
        text = hit.get("text", "")
        source_type = hit.get("source_type", "unknown")
        source_id = hit.get("source_id", "")
        context_blocks.append(f"[Source {idx + 1}: {title}]\n{text}")

        url = hit.get("channel") or hit.get("file_path")
        thumbnail = hit.get("thumbnail")

        if not url or not thumbnail:
            meta = _lookup_source_metadata(source_id)
            if not url:
                url = meta.get("channel") or meta.get("file_path")
            if not thumbnail:
                thumbnail = meta.get("thumbnail")

        if source_type == "youtube":
            url = f"https://www.youtube.com/watch?v={source_id}"
        elif source_type == "web" and url and not url.startswith("http"):
            url = None
        elif source_type == "instagram" and url and not url.startswith("http"):
            url = f"https://www.instagram.com/p/{source_id}/"
        elif source_type in ("pdf", "document", "audio"):
            if not url or not url.startswith("/"):
                url = f"/api/sources/{source_id}/download" if source_id else None

        citations.append(
            Citation(
                source_id=source_id,
                source_type=source_type,
                title=title,
                snippet=text[:200],
                url=url,
                thumbnail=thumbnail,
            )
        )

    context = "\n\n---\n\n".join(context_blocks)
    sources_list = "\n".join(
        f"[{i + 1}] {c.title} ({c.source_type})" for i, c in enumerate(citations)
    )
    prompt = f"CONTEXT:\n{context}\n\nSOURCES:\n{sources_list}\n\nQUESTION: {question}\n\nANSWER (cite sources using [1], [2] etc.):"
    response = await llm.generate(prompt, system=_ANSWER_SYS)
    return response, citations
