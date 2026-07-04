"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { ProcessingHeader, PipelineTimeline, LivePreview, AnalyticsPanel, ResultSection } from "@/components/processing";
import { Search, X, Play, Loader2 } from "lucide-react";

const YOUTUBE_STEPS = [
  { id: "validate", name: "1. Validating URL", icon: "link", description: "Checking if the YouTube URL is valid and accessible...", weight: 2 },
  { id: "metadata", name: "2. Fetching Metadata", icon: "info", description: "Getting title, channel, duration via yt-dlp...", weight: 10 },
  { id: "transcript", name: "3. Fetching Transcript", icon: "subtitles", description: "Trying YouTube Transcript API...", weight: 25 },
  { id: "summary", name: "4. Generating Summary", icon: "brain", description: "AI summarizing content using Ollama...", weight: 25 },
  { id: "chunking", name: "5. Chunking Content", icon: "scissors", description: "Splitting text into indexable chunks...", weight: 3 },
  { id: "embeddings", name: "6. Creating Embeddings", icon: "vector", description: "Generating vector embeddings...", weight: 25 },
  { id: "indexing", name: "7. Indexing to Vector DB", icon: "database", description: "Creating embeddings and storing in Qdrant...", weight: 10 },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function YouTubePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const { events, isStreaming, error, result, startStream, cancel, startedAt } = useSSE("youtube");

  const isIdle = !isStreaming && events.length === 0 && !error;

  const handleProcess = () => {
    if (!url) return;
    startStream(`${API_URL}/api/videos/process/stream`, { url });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url && !isStreaming) {
      handleProcess();
    }
  };

  let completedSteps = 0, activeStep = 0, failedStep = 0, activeStepName = "";
  const hasComplete = events.some((e) => e.event === "complete");
  for (const evt of events) {
    if (evt.event === "step_complete") completedSteps++;
    if (evt.event === "step_start") { activeStep = evt.data.step || 0; activeStepName = YOUTUBE_STEPS[(evt.data.step || 1) - 1]?.name || ""; }
    if (evt.event === "step_fail") failedStep = evt.data.step || 0;
  }
  if (hasComplete) completedSteps = YOUTUBE_STEPS.length;

  const overallProgress = (() => {
    if (events.some((e) => e.event === "complete")) return 100;
    let total = 0, done = 0;
    for (let i = 0; i < YOUTUBE_STEPS.length; i++) {
      const step = YOUTUBE_STEPS[i];
      total += step.weight;
      const stepNum = i + 1;
      const lastEvt = [...events].reverse().find((e) => e.data?.step === stepNum);
      if (lastEvt?.event === "step_complete") done += step.weight;
      else if (lastEvt?.event === "step_progress" && lastEvt.data.progress) done += (step.weight * lastEvt.data.progress) / 100;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  })();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="mb-8 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#111318] via-[#111318] to-[#6E56CF]/5 p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-[#FF0000]/10 shadow-lg shadow-[#FF0000]/5">
            <Play className="h-7 w-7 text-[#FF0000]" fill="currentColor" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#F5F5F5] tracking-tight">YouTube Intelligence</h1>
            <p className="mt-2 text-[15px] text-[#A1A1AA] leading-relaxed max-w-2xl">
              Transform videos into searchable knowledge. Extract transcripts, generate AI summaries, and build a queryable knowledge graph.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF0000]/10 px-3 py-1.5 text-[11px] font-medium text-[#FF0000]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF0000]" />
                YouTube
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Transcript API
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Whisper Fallback
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                yt-dlp
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6 rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Video URL</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isStreaming}
              className="w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#171A22] py-3.5 pl-11 pr-11 text-[14px] text-[#F5F5F5] placeholder-[#52525B] outline-none transition-all focus:border-[#FF0000]/50 focus:ring-2 focus:ring-[#FF0000]/10 disabled:opacity-50"
            />
            {url && !isStreaming && (
              <button onClick={() => setUrl("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-[#F5F5F5] transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isStreaming ? (
            <button
              onClick={cancel}
              className="flex items-center gap-2 rounded-[14px] border border-[#EF4444]/30 bg-[#EF4444]/10 px-6 py-3.5 text-[13px] font-semibold text-[#EF4444] transition-all hover:bg-[#EF4444]/20 hover:border-[#EF4444]/40"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Cancel
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!url}
              className="flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#FF0000] to-[#CC0000] px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:from-[#FF1A1A] hover:to-[#DD1A1A] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#FF0000]/10 hover:shadow-[#FF0000]/20"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Process Video
            </button>
          )}
        </div>
        <p className="mt-3 text-[12px] text-[#52525B]">
          Supports public YouTube videos, shorts, and live streams. Transcript will be auto-detected or Whisper will be used as fallback.
        </p>
      </div>

      {/* Processing header */}
      {!isIdle && (
        <div className="mb-6">
          <ProcessingHeader
            sourceType="youtube"
            title={result?.title || url}
            startedAt={startedAt}
            totalSteps={YOUTUBE_STEPS.length}
            completedSteps={completedSteps}
            activeStep={activeStep}
            activeStepName={activeStepName}
            failedStep={failedStep}
            isStreaming={isStreaming}
            onCancel={cancel}
            overallProgress={overallProgress}
          />
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Pipeline Progress</span>
              {!isIdle && (
                <span className="rounded-full bg-[#6E56CF]/10 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#6E56CF]">{completedSteps}/{YOUTUBE_STEPS.length}</span>
              )}
            </div>
            <PipelineTimeline steps={YOUTUBE_STEPS} events={events} isStreaming={isStreaming} error={error} isIdle={isIdle} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LivePreview events={events} isStreaming={isStreaming} isIdle={isIdle} sourceType="youtube" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AnalyticsPanel events={events} steps={YOUTUBE_STEPS} isStreaming={isStreaming} isIdle={isIdle} startedAt={startedAt} />
        </div>
      </div>

      {error && !isStreaming && (
        <div className="mt-6 rounded-[20px] border border-[#EF4444]/20 bg-[#EF4444]/[0.05] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EF4444]/10">
              <X className="h-4 w-4 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#EF4444]">Processing Error</p>
              <p className="mt-1 text-[12px] text-[#EF4444]/70">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <ResultSection
          events={events}
          isStreaming={isStreaming}
          onAskAI={(ctx) => {
            const params = new URLSearchParams({ source: "youtube", sourceId: ctx.sourceId, title: ctx.title, summary: ctx.summary });
            router.push(`/chat?${params.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
