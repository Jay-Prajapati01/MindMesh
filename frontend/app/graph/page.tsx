"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { getGraph } from "@/lib/api";

export default function GraphPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["graph"],
    queryFn: getGraph,
  });

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };

    // Simple circular layout so the graph is readable without a layout engine.
    const radius = Math.max(200, data.nodes.length * 24);
    const nodes: Node[] = data.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, data.nodes.length);
      return {
        id: n.id,
        data: { label: n.label },
        position: {
          x: radius + radius * Math.cos(angle),
          y: radius + radius * Math.sin(angle),
        },
        style: {
          background: "#1a1a24",
          color: "#f3f4f6",
          border: "1px solid #6366f1",
          borderRadius: 8,
          fontSize: 12,
          padding: 6,
        },
      };
    });

    const edges: Edge[] = data.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
      style: { stroke: "#4b5563" },
      labelStyle: { fill: "#9ca3af", fontSize: 10 },
    }));

    return { nodes, edges };
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <h1 className="mb-1 text-2xl font-semibold">Knowledge Graph</h1>
      <p className="mb-4 text-sm text-gray-400">
        Concepts and how they connect across everything you&apos;ve indexed.
      </p>

      {isLoading && <p className="text-sm text-gray-400">Loading graph...</p>}
      {data && data.nodes.length === 0 && (
        <p className="text-sm text-gray-400">
          No graph yet. Ingest some content first.
        </p>
      )}

      <div className="h-[70vh] rounded-xl border border-white/10 bg-[#0d0d16]">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#1f2937" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
