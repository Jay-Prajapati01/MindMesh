"""Knowledge graph: extract entities/relations and persist a graph.

During ingestion, `extract_relations` asks the LLM for (subject, relation,
object) triples describing the key concepts in a piece of text. These are
stored as nodes and edges in a JSON-backed graph store, each edge linked to
the source it came from. `get_graph` returns nodes + edges for visualization.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.tenant import cloud
from app.services import cloud_db, llm

logger = get_logger(__name__)
_lock = cloud_db.StoreLock()

_EXTRACT_SYS = (
    "You extract knowledge graph triples. Given text, return the most "
    "important concepts and how they relate."
)

_MAX_NODES = 500
_MAX_EDGES = 1000


def _path() -> Path:
    data_dir = Path(get_settings().data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "graph.json"


def _load() -> dict:
    if cloud():
        return cloud_db.load("graph", {"nodes": {}, "edges": []})
    path = _path()
    if not path.exists():
        return {"nodes": {}, "edges": []}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {"nodes": {}, "edges": []}


def _save(data: dict) -> None:
    if cloud():
        cloud_db.save("graph", data)
        return
    path = _path()
    # Atomic write: a crash mid-write must never truncate graph.json.
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, default=str, indent=2))
    tmp.replace(path)


def remove_source(source_id: str) -> None:
    """Drop all nodes/edges that came from a deleted source."""
    with _lock:
        data = _load()
        data["edges"] = [e for e in data["edges"] if e.get("source_id") != source_id]
        used = {e["source"] for e in data["edges"]} | {e["target"] for e in data["edges"]}
        data["nodes"] = {k: v for k, v in data["nodes"].items() if k in used}
        _save(data)


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
        
        # Prune if exceeding limits
        if len(data["nodes"]) > _MAX_NODES or len(data["edges"]) > _MAX_EDGES:
            data = _prune_graph(data)
        
        _save(data)
        return len(triples)


def _prune_graph(data: dict) -> dict:
    """Remove least important nodes/edges to stay within limits."""
    # Sort nodes by count (importance) and keep top N
    sorted_nodes = sorted(
        data["nodes"].items(),
        key=lambda x: x[1].get("count", 0),
        reverse=True,
    )
    kept_keys = {k for k, _ in sorted_nodes[:_MAX_NODES]}
    
    # Filter nodes
    data["nodes"] = {k: v for k, v in data["nodes"].items() if k in kept_keys}
    
    # Filter edges to only include kept nodes
    data["edges"] = [
        e for e in data["edges"]
        if e["source"] in kept_keys and e["target"] in kept_keys
    ][:_MAX_EDGES]
    
    logger.info("Pruned graph to %d nodes, %d edges", len(data["nodes"]), len(data["edges"]))
    return data


def get_graph() -> dict:
    """Return the graph as {nodes: [...], edges: [...]} for the frontend."""
    data = _load()
    nodes = [
        {"id": key, "label": node["label"], "count": node["count"]}
        for key, node in data["nodes"].items()
    ]
    return {"nodes": nodes, "edges": data["edges"]}


def replace_triples(triples, source_id, source_type, title=None):
    """Atomically replace one source's edges and recompute node counts on retries."""
    with _lock:
        data = _load()
        edges = [e for e in data["edges"] if e.get("source_id") != source_id]
        unique = {(t["subject"].strip().lower(), t["object"].strip().lower(), t["relation"].strip()) for t in triples}
        edges.extend({"source": a, "target": b, "label": relation, "source_id": source_id,
                      "source_type": source_type, "title": title} for a, b, relation in sorted(unique))
        nodes = {}
        for edge in edges:
            for key in (edge["source"], edge["target"]):
                nodes.setdefault(key, {"label": key, "count": 0})["count"] += 1
        _save(_prune_graph({"nodes": nodes, "edges": edges}))
    return len(unique)
