"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Layers, Maximize2, Network, Search } from "lucide-react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeChange,
  Panel,
  ReactFlowInstance,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { getGraph } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { getGraphTheme } from "@/lib/graphTheme";
import { ConceptData, ConceptNode } from "@/components/graph/ConceptNode";
import { GraphDetailPanel, PanelConnection } from "@/components/graph/GraphDetailPanel";
import {
  Adjacency,
  buildAdjacency,
  cleanLabel,
  estimateRadius,
  runForceLayout,
  SOURCE_LABELS,
  sourceColor,
} from "@/components/graph/graphModel";

const NODE_TYPES = { concept: ConceptNode };

const short = (text: string, max = 30) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

interface ChipProps {
  active: boolean;
  color: string;
  label: string;
  count: number;
  onClick: () => void;
}

function Chip({ active, color, label, count, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-all ${
        active
          ? "bg-surface border-2 border-ink font-medium text-foreground shadow-sm"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
      style={active ? { boxShadow: `inset 0 0 0 1px ${color}99` } : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
      <span className="text-[10px] tabular-nums opacity-60">{count}</span>
    </button>
  );
}

export default function GraphPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["graph"],
    queryFn: getGraph,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const theme = useAppStore((s) => s.settings.theme);
  const graphTheme = useMemo(() => getGraphTheme(theme), [theme]);

  const [filterType, setFilterType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [noMatch, setNoMatch] = useState(false);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const firstFit = useRef(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const hoverTimer = useRef(0);
  const pendingHover = useRef<string | null>(null);
  const scheduleHover = useCallback((id: string | null) => {
    pendingHover.current = id;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHoverId(pendingHover.current);
    }, 140);
  }, []);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const filtered = useMemo(() => {
    const edges = (data?.edges ?? []).filter((e) => !filterType || e.source_type === filterType);
    const used = new Set<string>();
    for (const e of edges) {
      used.add(e.source);
      used.add(e.target);
    }
    const nodes = (data?.nodes ?? []).filter((n) => used.has(n.id));
    return { nodes, edges };
  }, [data, filterType]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of data?.edges ?? []) {
      counts.set(e.source_type, (counts.get(e.source_type) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const adj: Adjacency = useMemo(
    () => buildAdjacency(filtered.nodes, filtered.edges),
    [filtered],
  );

  const layoutCache = useRef(new Map<string, Record<string, { x: number; y: number }>>());
  const layout = useMemo(() => {
    const key = `${filterType}|${filtered.nodes.map((n) => n.id).join(",")}`;
    const cached = layoutCache.current.get(key);
    if (cached) return cached;
    const radii: Record<string, number> = {};
    const ids = filtered.nodes.map((n) => {
      radii[n.id] = estimateRadius(n.label, adj.degree.get(n.id) ?? 0);
      return n.id;
    });
    const result = runForceLayout(ids, filtered.edges, radii);
    if (layoutCache.current.size > 20) layoutCache.current.clear();
    layoutCache.current.set(key, result);
    return result;
  }, [filtered, adj, filterType]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [id, list] of adj.incident) {
      map.set(id, new Set(list.map((i) => i.otherId)));
    }
    return map;
  }, [adj]);

  const baseNodes = useMemo<Node<ConceptData>[]>(() => {
    return filtered.nodes.map((n) => {
      const degree = adj.degree.get(n.id) ?? 0;
      const color = sourceColor(adj.dominant.get(n.id));
      const hub = degree >= 3 || n.count >= 3;
      return {
        id: n.id,
        type: "concept",
        className: "concept-node",
        position: layout[n.id] ?? { x: 0, y: 0 },
        zIndex: hub ? 2 : 1,
        data: { label: n.label, count: n.count, degree, color, hub, active: false },
      };
    });
  }, [filtered, adj, layout]);

  const baseEdges = useMemo<Edge[]>(() => {
    return filtered.edges.map((e, i) => {
      const color = sourceColor(e.source_type);
      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: "default",
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: `${color}99` },
        style: { stroke: color, strokeWidth: 1.6, strokeOpacity: 0.5 },
        data: { relation: e.label, color, sourceType: e.source_type },
      };
    });
  }, [filtered]);

  const [nodes, setNodes] = useState<Node<ConceptData>[]>([]);
  useEffect(() => {
    setNodes(baseNodes);
  }, [baseNodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges<ConceptData>(changes, prev));
  }, []);

  const activeId = selectedId ?? hoverId;

  useLayoutEffect(() => {
    setNodes((prev) => {
      const isOn = (id: string) =>
        activeId !== null && (id === activeId || neighbors.get(activeId)?.has(id) === true);
      let any = false;
      for (const n of prev) {
        if (isOn(n.id) !== (n.className === "concept-node concept-on") || n.data.active !== (activeId === n.id)) {
          any = true;
          break;
        }
      }
      if (!any) return prev;
      return prev.map((n) => {
        const on = isOn(n.id);
        const has = n.className === "concept-node concept-on";
        const act = activeId === n.id;
        if (on === has && n.data.active === act) return n;
        return {
          ...n,
          className: on ? "concept-node concept-on" : "concept-node",
          data: { ...n.data, active: act },
        };
      });
    });
  }, [activeId, neighbors]);

  const edges = useMemo<Edge[]>(() => {
    if (selectedId === null) return baseEdges;
    return baseEdges.map((e) => {
      const on = e.source === selectedId || e.target === selectedId;
      const color = (e.data as { color?: string } | undefined)?.color ?? sourceColor();
      return {
        ...e,
        animated: on,
        label: on ? short((e.data as { relation?: string } | undefined)?.relation ?? "") : undefined,
        labelStyle: { fill: graphTheme.edgeLabel, fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: graphTheme.edgeLabelBackground, fillOpacity: 0.95 },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 8,
        style: {
          stroke: color,
          strokeWidth: on ? 2.4 : 1.6,
          strokeOpacity: on ? 1 : 0.08,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: on ? `${color}CC` : `${color}26`,
        },
      };
    });
  }, [baseEdges, selectedId, graphTheme]);

  const selectedNode = useMemo(
    () => filtered.nodes.find((n) => n.id === selectedId) ?? null,
    [filtered.nodes, selectedId],
  );

  const connections = useMemo<PanelConnection[]>(() => {
    if (!selectedId) return [];
    const nodeById = new Map(filtered.nodes.map((n) => [n.id, n]));
    return (adj.incident.get(selectedId) ?? []).map(({ edge, otherId, direction }) => ({
      id: otherId,
      label: cleanLabel(nodeById.get(otherId)?.label ?? otherId),
      direction,
      relation: edge.label,
      sourceType: edge.source_type,
      title: edge.title,
    }));
  }, [selectedId, adj, filtered.nodes]);

  useEffect(() => {
    if (selectedId && !filtered.nodes.some((n) => n.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered.nodes, selectedId]);

  const focusNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node || !rf) return;
    rf.setCenter(node.position.x, node.position.y, {
      zoom: Math.max(rf.getZoom(), 1.05),
      duration: 450,
    });
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    focusNode(id);
  };

  const fitWholeGraph = () => {
    rf?.fitView({ padding: 0.06, duration: 400, maxZoom: 1.2 });
  };

  useEffect(() => {
    if (!rf || baseNodes.length === 0) return;
    let cancelled = false;
    let timer = 0;
    const attemptFit = (attempt: number) => {
      if (cancelled) return;
      let ok = false;
      try {
        ok = rf.fitView({ padding: 0.06, duration: firstFit.current ? 0 : 300, maxZoom: 1.15 });
      } catch {
        ok = false;
      }
      if (ok) {
        firstFit.current = false;
        return;
      }
      if (attempt < 10) timer = window.setTimeout(() => attemptFit(attempt + 1), 200);
    };
    timer = window.setTimeout(() => attemptFit(0), 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [rf, baseNodes]);

  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !rf) return;
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const id = selectedRef.current;
        if (id) {
          const node = rf.getNodes().find((n) => n.id === id);
          if (node) {
            rf.setCenter(node.position.x, node.position.y, { zoom: rf.getZoom(), duration: 0 });
          }
        } else {
          rf.fitView({ padding: 0.06, duration: 0, maxZoom: 1.15 });
        }
      }, 180);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [rf]);

  const runSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = filtered.nodes.find((n) => cleanLabel(n.label).toLowerCase().includes(q));
    if (hit) {
      setNoMatch(false);
      setSelectedId(hit.id);
      focusNode(hit.id);
    } else {
      setNoMatch(true);
    }
  };

  const hasGraph = data !== undefined && filtered.nodes.length > 0;

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-[460px] flex-col text-foreground">
      <div className="mb-1 flex items-center gap-2">
        <Network className="h-5 w-5 text-brand" aria-hidden />
        <h1 className="text-2xl font-semibold text-foreground">Knowledge Graph</h1>
      </div>
      <p className="mb-3 text-sm text-muted">
        Concepts and how they connect across everything you&apos;ve indexed — click any node to
        explore it.
      </p>

      {/* Toolbar: stats · source filters · search · fit */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs text-muted">
          <b className="text-foreground tabular-nums">{filtered.nodes.length}</b> concepts
          <span className="mx-1 opacity-40">·</span>
          <b className="text-foreground tabular-nums">{filtered.edges.length}</b> relations
        </span>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by source type">
          <Chip
            active={filterType === ""}
            color="var(--brand)"
            label="All"
            count={data?.edges.length ?? 0}
            onClick={() => setFilterType("")}
          />
          {typeCounts.map(([type, count]) => (
            <Chip
              key={type}
              active={filterType === type}
              color={sourceColor(type)}
              label={SOURCE_LABELS[type] ?? type}
              count={count}
              onClick={() => setFilterType(filterType === type ? "" : type)}
            />
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setNoMatch(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              placeholder="Find a concept…"
              aria-label="Find a concept in the graph"
              className={`w-44 rounded-lg border bg-surface py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:outline-none ${
                noMatch ? "border-danger/60" : "border-border focus:border-brand"
              }`}
            />
          </div>
          {noMatch && <span className="text-[11px] text-danger font-medium">no match</span>}
          <button
            onClick={fitWholeGraph}
            aria-label="Fit whole graph to view"
            title="Fit whole graph to view"
            className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-2.5 py-1.5 text-xs text-foreground-3 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fit
          </button>
        </div>
      </div>

      {/* Canvas + detail panel */}
      <div ref={canvasRef} className="relative flex min-h-0 flex-1 gap-3">
        <div
          className={`relative min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-ink bg-card shadow-card ${
            activeId !== null ? " graph-has-active" : ""
          }`}
          style={{ backgroundColor: graphTheme.canvas }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onInit={setRf}
            fitView
            fitViewOptions={{ padding: 0.06, maxZoom: 1.15 }}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onNodeMouseEnter={(_, node) => scheduleHover(node.id)}
            onNodeMouseLeave={() => scheduleHover(null)}
            onPaneClick={() => {
              setSelectedId(null);
              scheduleHover(null);
            }}
            minZoom={0.05}
            maxZoom={2}
            nodesConnectable={false}
            deleteKeyCode={null}
            zoomOnDoubleClick={false}
            onlyRenderVisibleElements
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={graphTheme.grid} />
            <Controls showInteractive={false} />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              className="hidden sm:block border-2 border-ink rounded-lg overflow-hidden"
              style={{ background: graphTheme.minimapBackground }}
              maskColor={graphTheme.minimapMask}
              nodeColor={(n) => (n.data as ConceptData | undefined)?.color ?? "var(--brand)"}
              nodeStrokeWidth={0}
            />
            {selectedId === null && (
              <Panel position="top-left" className="!m-3">
                <div className="rounded-full border-2 border-ink bg-card/90 backdrop-blur-md px-3 py-1.5 text-[12px] text-muted shadow-sm">
                  💡 Click a concept to explore its connections
                </div>
              </Panel>
            )}
          </ReactFlow>

          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Loading graph…
              </div>
            </div>
          )}

          {data !== undefined && !isLoading && !hasGraph && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center">
              <Network className="h-8 w-8 text-subtle" aria-hidden />
              <p className="text-sm text-muted">
                {filterType
                  ? `No ${SOURCE_LABELS[filterType] ?? filterType} concepts yet.`
                  : "No graph yet. Ingest some content first."}
              </p>
              {filterType && (
                <button
                  onClick={() => setFilterType("")}
                  className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-surface px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-muted"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Show all sources
                </button>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedNode && (
            <GraphDetailPanel
              key="graph-panel"
              label={cleanLabel(selectedNode.label)}
              count={selectedNode.count}
              degree={adj.degree.get(selectedNode.id) ?? 0}
              color={sourceColor(adj.dominant.get(selectedNode.id))}
              types={[
                ...new Set(
                  (adj.incident.get(selectedNode.id) ?? []).map((i) => i.edge.source_type),
                ),
              ].sort()}
              connections={connections}
              onSelect={selectNode}
              onClose={() => setSelectedId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
