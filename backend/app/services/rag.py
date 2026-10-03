"""Retrieval-augmented generation: summaries, topics, and grounded answers."""
from __future__ import annotations

import json
import re
import time
from typing import AsyncIterator

from app.core.config import get_settings
from app.models.schemas import Citation, ChatMessage
from app.services import embeddings, llm, note_search, store, vectorstore

_SUMMARY_SYS = (
    "You are a precise assistant that summarizes content. "
    "Return concise, factual summaries."
)

_ANSWER_SYS = (
    "You are MindMesh, a personal knowledge assistant that answers ONLY from "
    "the user's own indexed content provided in CONTEXT. "
    "Rules: "
    "1) Never use general or world knowledge - every fact must come from CONTEXT. "
    "2) If the answer is not in CONTEXT, say you don't have that information in "
    "the user's content and suggest what they could add. Do not guess or invent. "
    "3) For greetings or small talk, reply in one short friendly sentence and ask "
    "what they would like to know from their content; never fabricate details. "
    "4) Be concise and accurate. "
    "5) When you reference a source, include a citation marker like [1], [2] etc. "
    "corresponding to the source number in the SOURCES list. "
    "6) Conversation history may be used only to understand follow-up questions; "
    "the facts themselves must still come from CONTEXT."
)

_NO_CONTEXT_ANSWER = "I don't have any indexed knowledge yet. Add some content first."
_NO_MATCH_ANSWER = (
    "I couldn't find anything relevant to that in your indexed content. "
    "Try rephrasing your question, or add content covering that topic."
)


async def _retrieve(
    question: str,
    top_k: int,
    source_type: str | None = None,
    source_id: str | None = None,
) -> list[dict]:
    """Fetch the most relevant chunks for a question.

    Combines dense vector search over Qdrant with plain-text Workspace note
    matches (notes are not embedded), drops everything below the relevance
    threshold, and returns the best `top_k` hits — so chat can reach all of
    the user's stored data while answers stay grounded in their own content.
    """
    settings = get_settings()
    query_vec = await embeddings.embed_text(question)
    hits = vectorstore.search(query_vec, top_k, source_type=source_type, source_id=source_id)
    if not source_id:
        hits = hits + note_search.note_hits(question, source_type)
    hits.sort(key=lambda h: h.get("score") or 0.0, reverse=True)
    relevant = [h for h in hits if (h.get("score") or 0.0) >= settings.chat_min_score]
    return relevant[:top_k]


def _lookup_source_metadata(source_id: str) -> dict:
    """Look up source metadata from store.json as fallback for old Qdrant chunks."""
    sources = store.list_sources()
    for s in sources:
        if s.get("source_id") == source_id:
            return s
    return {}


_HEADING_RE = re.compile(r"(?m)^(#{1,6}\s+.+)$")


def _summary_excerpt(text: str, budget: int = 8000) -> str:
    """Build a whole-document digest that fits the LLM context budget.

    Long documents are sampled across every heading section (headlines are
    always kept) instead of truncating the tail, so the summary covers the
    full document — not just the first pages.
    """
    text = text or ""
    if len(text) <= budget:
        return text

    matches = list(_HEADING_RE.finditer(text))
    if not matches:
        head = int(budget * 0.6)
        tail = budget - head - 60
        omitted = len(text) - head - tail
        return (
            text[:head]
            + f"\n\n[... {omitted} characters omitted ...]\n\n"
            + text[-tail:]
        )

    # (heading, body) pairs from markdown structure
    sections: list[tuple[str, str]] = []
    for idx, match in enumerate(matches):
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        before = text[: match.start()].strip()
        if idx == 0 and before:
            sections.append(("", before))
        sections.append((match.group(1).strip(), text[start:end].strip()))

    heading_cost = sum(len(h) + 2 for h, _ in sections) + 40 * len(sections)
    body_budget = max(budget - heading_cost, 400 * len(sections))
    total_body = sum(len(b) for _, b in sections) or 1

    parts: list[str] = []
    for heading, body in sections:
        share = max(240, int(len(body) / total_body * body_budget))
        if len(body) > share:
            body = body[:share].rsplit(" ", 1)[0] + " [...]"
        block = f"{heading}\n{body}" if heading else body
        parts.append(block)
    return "\n\n".join(parts)[: budget + 500]


async def summarize(text: str) -> tuple[str, list[str]]:
    """Produce a summary and a list of key topics for the given text."""
    excerpt = _summary_excerpt(text)
    prompt = (
        "Summarize the following content in 4-6 sentences, then list 5 key "
        "topics. The content is markdown and may contain headings and tables; "
        "use them to cover the WHOLE document, not just the beginning. "
        "Respond as JSON with keys 'summary' (string) and 'topics' "
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
    excerpt = _summary_excerpt(text)
    prompt = (
        "Summarize the following content in 4-6 sentences, then list 5 key "
        "topics. The content is markdown and may contain headings and tables; "
        "use them to cover the WHOLE document, not just the beginning. "
        "Respond as JSON with keys 'summary' (string) and 'topics' "
        f"(array of strings).\n\nCONTENT:\n{excerpt}"
    )
    async for token in llm.generate_stream(prompt, system=_SUMMARY_SYS):
        yield token


async def answer(
    question: str,
    top_k: int | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    history: list[ChatMessage] | None = None,
) -> tuple[str, list[Citation], dict]:
    """Retrieve relevant chunks and generate a grounded answer with citations.

    Returns (answer_text, citations, metrics).
    """
    settings = get_settings()
    top_k = top_k or settings.top_k
    start_time = time.time()

    hits = await _retrieve(question, top_k, source_type=source_type, source_id=source_id)
    search_time_ms = int((time.time() - start_time) * 1000)

    metrics = {
        "search_time_ms": search_time_ms,
        "chunks_searched": len(hits),
        "sources_searched": len({h.get("source_id") for h in hits}),
    }

    if not hits:
        # Nothing indexed at all vs. nothing *relevant* to this question:
        # both refuse to answer rather than falling back to general knowledge.
        if vectorstore.count() == 0 and not store.list_notes():
            return (_NO_CONTEXT_ANSWER, [], metrics)
        return (_NO_MATCH_ANSWER, [], metrics)

    context_blocks, citations = [], []
    for idx, hit in enumerate(hits):
        title = hit.get("title") or hit.get("source_id", "unknown")
        text = hit.get("text", "")
        hit_source_type = hit.get("source_type", "unknown")
        hit_source_id = hit.get("source_id", "")
        context_blocks.append(f"[Source {idx + 1}: {title}]\n{text}")

        # Only http(s) values are safe links. `channel` often holds a channel
        # NAME (e.g. "MrBeast"), never use it as a URL unless it is a real link.
        url = hit.get("url") or ""
        if not url.startswith(("http://", "https://")):
            url = ""

        if not url:
            meta = _lookup_source_metadata(hit_source_id)
            meta_url = meta.get("url") or ""
            if meta_url.startswith(("http://", "https://")):
                url = meta_url

        if hit_source_type in ("pdf", "document", "audio"):
            url = f"{settings.api_prefix}/sources/{hit_source_id}/download" if hit_source_id else None

        thumbnail = hit.get("thumbnail")
        if not thumbnail:
            meta = _lookup_source_metadata(hit_source_id) if hit_source_id else {}
            thumbnail = meta.get("thumbnail")

        citations.append(
            Citation(
                source_id=hit_source_id,
                source_type=hit_source_type,
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

    history_text = ""
    if history:
        history_lines = []
        for msg in history[-6:]:  # Keep last 6 messages for context
            role = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{role}: {msg.content}")
        history_text = "\n\nCONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n"

    prompt = f"CONTEXT:\n{context}\n\nSOURCES:\n{sources_list}\n{history_text}\nQUESTION: {question}\n\nANSWER (cite sources using [1], [2] etc.):"
    response = await llm.generate(prompt, system=_ANSWER_SYS)
    return response, citations, metrics


async def answer_stream(
    question: str,
    top_k: int | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    history: list[ChatMessage] | None = None,
) -> AsyncIterator[str]:
    """Stream answer tokens from the LLM. Yields raw tokens."""
    settings = get_settings()
    top_k = top_k or settings.top_k

    hits = await _retrieve(question, top_k, source_type=source_type, source_id=source_id)

    if not hits:
        if vectorstore.count() == 0 and not store.list_notes():
            yield _NO_CONTEXT_ANSWER
        else:
            yield _NO_MATCH_ANSWER
        return

    context_blocks = []
    for idx, hit in enumerate(hits):
        title = hit.get("title") or hit.get("source_id", "unknown")
        text = hit.get("text", "")
        context_blocks.append(f"[Source {idx + 1}: {title}]\n{text}")

    context = "\n\n---\n\n".join(context_blocks)
    sources_list = "\n".join(
        f"[{i + 1}] {hit.get('title') or hit.get('source_id', 'unknown')} ({hit.get('source_type', 'unknown')})"
        for i, hit in enumerate(hits)
    )

    history_text = ""
    if history:
        history_lines = []
        for msg in history[-6:]:
            role = "User" if msg.role == "user" else "Assistant"
            history_lines.append(f"{role}: {msg.content}")
        history_text = "\n\nCONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n"

    prompt = f"CONTEXT:\n{context}\n\nSOURCES:\n{sources_list}\n{history_text}\nQUESTION: {question}\n\nANSWER (cite sources using [1], [2] etc.):"
    async for token in llm.generate_stream(prompt, system=_ANSWER_SYS):
        yield token
