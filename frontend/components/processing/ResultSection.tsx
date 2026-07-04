"use client";

import { useMemo } from "react";
import { SSEEvent } from "@/hooks/useSSE";
import { MessageSquare } from "lucide-react";

interface AskAIContext {
  sourceId: string;
  title: string;
  summary: string;
}

interface ResultSectionProps {
  events: SSEEvent[];
  isStreaming: boolean;
  onAskAI?: (ctx: AskAIContext) => void;
}

export function ResultSection({ events, isStreaming, onAskAI }: ResultSectionProps) {
  const completeEvent = useMemo(() => events.find((e) => e.event === "complete"), [events]);
  const data = completeEvent?.data;

  const totalMs = useMemo(() => {
    let ms = 0;
    for (const e of events) {
      if (e.event === "step_complete" && e.data.duration_ms) {
        ms += e.data.duration_ms;
      }
    }
    return ms;
  }, [events]);

  const sourceId = data?.source_id || data?.video_id || data?.post_id || "";
  const title = data?.title || "";
  const summary = data?.summary || "";

  if (isStreaming || !completeEvent || !data) return null;

  return (
    <div className="animate-slide-up space-y-4">
      {/* Completion banner */}
      <div className="flex items-center justify-between rounded-[20px] border border-[#22C55E]/20 bg-[#22C55E]/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22C55E]/20">
            <svg className="h-4 w-4 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#F5F5F5]">
              All steps completed in {(totalMs / 1000).toFixed(1)}s
            </p>
            <p className="text-[11px] text-[#71717A]">Content has been successfully processed and indexed.</p>
          </div>
        </div>
      </div>

      {/* Result cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">📝</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#71717A]">Summary</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#A1A1AA] line-clamp-4">{summary || "—"}</p>
        </div>
        <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">🏷️</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#71717A]">Topics</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(data.key_topics || []).slice(0, 5).map((t: string) => (
              <span key={t} className="rounded-full bg-[#6E56CF]/10 px-2 py-0.5 text-[9px] font-medium text-[#6E56CF]">{t}</span>
            ))}
          </div>
        </div>
        <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">🕸️</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#71717A]">Knowledge</span>
          </div>
          <div className="space-y-1 text-[11px] text-[#A1A1AA]">
            <p>Graph updated</p>
            <p className="text-[10px] text-[#71717A]">Relationships extracted</p>
          </div>
        </div>
        <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px]">📊</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#71717A]">Stats</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#71717A]">Chunks</span>
              <span className="tabular-nums font-medium text-[#A1A1AA]">{data.chunks_indexed || 0}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#71717A]">Vectors</span>
              <span className="tabular-nums font-medium text-[#A1A1AA]">{data.chunks_indexed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ask AI */}
      {onAskAI && sourceId && (
        <button
          onClick={() => onAskAI({ sourceId, title, summary })}
          className="w-full rounded-[16px] border border-[#6E56CF]/20 bg-[#6E56CF]/[0.06] p-3.5 text-[13px] font-medium text-[#6E56CF] transition-all hover:bg-[#6E56CF]/[0.12] hover:border-[#6E56CF]/30 hover:shadow-[0_0_20px_rgba(110,86,207,0.1)] flex items-center justify-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Ask AI about this content
          <span className="text-[#6E56CF]/60">→</span>
        </button>
      )}
    </div>
  );
}
