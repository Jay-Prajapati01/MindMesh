"""Knowledge graph: extract entities/relations and persist a graph.

During ingestion, `extract_relations` asks the LLM for (subject, relation,
object) triples describing the key concepts in a piece of text. These are
stored as nodes and edges in a JSON-backed graph store, each edge linked to
the source it came from. `get_graph` returns nodes + edges for visualization.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services import llm

logger = get_logger(__name__)
_lock = threading.Lock()

_EXTRACT_SYS = (
    "You extract knowledge graph triples. Given text, return the most "
    "important concepts and how they relate."
)


def _path() -> Path:
    data_dir = Path(get_settings().data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "graph.json"


def _load() -> dict:
    path = _path()
    if not path.exists():
        return {"nodes": {}, "edges": []}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {"nodes": {}, "edges": []}


def _save(data: dict) -> None:
    _path().write_text(json.dumps(data, default=str, indent=2))


async def extract_relations(text: str) -> list[dict]:
    """Ask the LLM for up to ~10 (subject, relation, object) triples."""
    excerpt = text[:6000]
    prompt = (
        "Extract up to 10 knowledge triples from the text. Respond ONLY as "
        'JSON: {"triples": [{"subject": str, "relation": str, "object": str}]}.'
        f"\n\nTEXT:\n{excerpt}"
    )
    raw = await llm.generate(prompt, system=_EXTRACT_SYS)
    try:
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start : end + 1])
        triples = data.get("triples", [])
        return [
            t
            for t in triples
            if t.get("subject") and t.get("relation") and t.get("object")
        ]
    except (ValueError, json.JSONDecodeError):
        logger.warning("Failed to parse graph triples")
        return []


def add_triples(
    triples: list[dict],
    source_id: str,
    source_type: str,
    title: str | None = None,
) -> int:
    """Merge triples into the graph, tagging edges with their source."""
    if not triples:
        return 0
    with _lock:
        data = _load()
        for t in triples:
            for name in (t["subject"], t["object"]):
                key = name.strip().lower()
                node = data["nodes"].get(key, {"label": name.strip(), "count": 0})
                node["count"] += 1
                data["nodes"][key] = node
            data["edges"].append(
                {
                    "source": t["subject"].strip().lower(),
                    "target": t["object"].strip().lower(),
                    "label": t["relation"].strip(),
                    "source_id": source_id,
                    "source_type": source_type,
                    "title": title,
                }
            )
        _save(data)
        return len(triples)


def get_graph() -> dict:
    """Return the graph as {nodes: [...], edges: [...]} for the frontend."""
    data = _load()
    nodes = [
        {"id": key, "label": node["label"], "count": node["count"]}
        for key, node in data["nodes"].items()
    ]
    return {"nodes": nodes, "edges": data["edges"]}
