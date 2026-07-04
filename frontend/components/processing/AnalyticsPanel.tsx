"use client";

import { useEffect, useMemo, useState } from "react";
import { SSEEvent } from "@/hooks/useSSE";

interface AnalyticsPanelProps {
  events: SSEEvent[];
  steps: { id: string; name: string }[];
  isStreaming: boolean;
  isIdle: boolean;
  startedAt: number;
}

interface Metric {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  bold?: boolean;
}

function AnimatedNumber({ value, duration = 500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === display) return;
    const start = display;
    const diff = value - start;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration, display]);

  return <span className="tabular-nums">{display}</span>;
}

export function AnalyticsPanel({ events, steps, isStreaming, isIdle, startedAt }: AnalyticsPanelProps) {
  const [elapsed, setElapsed] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      if (startedAt > 0) setElapsed(Date.now() - startedAt);
      return;
    }
    const i = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(i);
  }, [isStreaming, startedAt]);

  useEffect(() => {
    for (const evt of events) {
      if (evt.event === "stream_token") setTokenCount((c) => c + 1);
    }
  }, [events]);

  const stats = useMemo(() => {
    let completedSteps = 0;
    let currentStepName = "";
    let chunks = 0;
    let vectors = 0;
    const isComplete = events.some((e) => e.event === "complete");

    for (const evt of events) {
      const d = evt.data;
      if (evt.event === "step_complete") {
        completedSteps++;
        if (d.chunk_count) chunks = d.chunk_count;
        if (d.vectors_count) vectors = d.vectors_count;
      }
      if (evt.event === "step_start") {
        const idx = (d.step || 1) - 1;
        currentStepName = steps[idx]?.name || "";
      }
    }

    if (isComplete) {
      currentStepName = "All steps completed";
      completedSteps = steps.length;
    }

    return { completedSteps, currentStepName, chunks, vectors };
  }, [events, steps]);

  const elapsedSecs = Math.floor(elapsed / 1000);
  const eta = stats.completedSteps > 0
    ? Math.ceil((elapsed / stats.completedSteps) * (steps.length - stats.completedSteps) / 1000)
    : 0;

  const metrics: Metric[] = [
    { label: "Pipeline", value: isStreaming ? "Active" : isIdle ? "Ready" : "Done", icon: "⚡", color: isStreaming ? "text-[#6E56CF]" : isIdle ? "text-[#71717A]" : "text-[#22C55E]", bold: true },
    { label: "Current Task", value: stats.currentStepName || (isIdle ? "Idle" : "Starting..."), icon: "📋" },
    { label: "Elapsed", value: `${elapsedSecs}s`, icon: "⏱️" },
    { label: "ETA", value: isStreaming && eta > 0 ? `~${eta}s` : "—", icon: "⏳" },
    { label: "Steps", value: `${stats.completedSteps}/${steps.length}`, icon: "📊" },
    { label: "Chunks", value: stats.chunks, icon: "📦" },
    { label: "Vectors", value: stats.vectors, icon: "🔢" },
    { label: "Tokens", value: tokenCount, icon: "🔤" },
    { label: "LLM", value: "qwen2.5:3b", icon: "🧠" },
    { label: "Embeddings", value: "nomic-embed-text", icon: "📐" },
    { label: "Vector DB", value: "Qdrant", icon: "💾" },
    { label: "Graph", value: isStreaming ? "Building" : isIdle ? "Ready" : "Done", icon: "🕸️" },
  ];

  return (
    <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">System Status</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isStreaming ? "bg-[#22C55E] animate-pulse" : "bg-[#71717A]"}`} />
          <span className="text-[10px] text-[#71717A]">{isStreaming ? "Healthy" : "Idle"}</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between rounded-[8px] px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-2">
              <span className="text-[11px]">{m.icon}</span>
              <span className="text-[10px] text-[#71717A]">{m.label}</span>
            </div>
            <span className={`text-[11px] tabular-nums ${m.bold ? "font-bold" : "font-medium"} ${m.color || "text-[#A1A1AA]"}`}>
              {typeof m.value === "number" ? <AnimatedNumber value={m.value} /> : m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Progress ring */}
      <div className="mt-4 flex justify-center">
        <div className="relative h-20 w-20">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={isStreaming ? "#6E56CF" : stats.completedSteps === steps.length ? "#22C55E" : "rgba(255,255,255,0.08)"}
              strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - (stats.completedSteps / steps.length))}`}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[14px] font-bold tabular-nums text-[#F5F5F5]">
              {Math.round((stats.completedSteps / steps.length) * 100)}%
            </span>
            <span className="text-[8px] text-[#71717A]">COMPLETE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
