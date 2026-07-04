"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { ProcessingHeader, PipelineTimeline, LivePreview, AnalyticsPanel, ResultSection } from "@/components/processing";
import { Search, X, Camera, Loader2 } from "lucide-react";

const INSTAGRAM_STEPS = [
  { id: "validate", name: "1. Validating URL", icon: "link", description: "Checking if the Instagram URL is valid...", weight: 2 },
  { id: "render", name: "2. Rendering Page", icon: "globe", description: "Opening post in headless browser via Playwright...", weight: 35 },
  { id: "caption", name: "3. Extracting Caption", icon: "document", description: "Parsing caption and username from page...", weight: 5 },
  { id: "media", name: "4. Extracting Media", icon: "scan", description: "Downloading images/video for processing...", weight: 10 },
  { id: "text", name: "5. Extracting Text", icon: "search", description: "Running OCR on images and Whisper on audio...", weight: 15 },
  { id: "summary", name: "6. Generating Summary", icon: "brain", description: "AI summarizing content using Ollama...", weight: 25 },
  { id: "indexing", name: "7. Indexing to Vector DB", icon: "database", description: "Creating embeddings and storing in Qdrant...", weight: 8 },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function InstagramPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const { events, isStreaming, error, result, startStream, cancel, startedAt } = useSSE("instagram");

  const isIdle = !isStreaming && events.length === 0 && !error;

  const handleProcess = () => {
    if (!url) return;
    startStream(`${API_URL}/api/instagram/process/stream`, { url });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url && !isStreaming) handleProcess();
  };

  let completedSteps = 0, activeStep = 0, failedStep = 0, activeStepName = "";
  const hasComplete = events.some((e) => e.event === "complete");
  for (const evt of events) {
    if (evt.event === "step_complete") completedSteps++;
    if (evt.event === "step_start") { activeStep = evt.data.step || 0; activeStepName = INSTAGRAM_STEPS[(evt.data.step || 1) - 1]?.name || ""; }
    if (evt.event === "step_fail") failedStep = evt.data.step || 0;
  }
  if (hasComplete) completedSteps = INSTAGRAM_STEPS.length;

  const overallProgress = (() => {
    if (events.some((e) => e.event === "complete")) return 100;
    let total = 0, done = 0;
    for (let i = 0; i < INSTAGRAM_STEPS.length; i++) {
      total += INSTAGRAM_STEPS[i].weight;
      const stepNum = i + 1;
      const lastEvt = [...events].reverse().find((e) => e.data?.step === stepNum);
      if (lastEvt?.event === "step_complete") done += INSTAGRAM_STEPS[i].weight;
      else if (lastEvt?.event === "step_progress" && lastEvt.data.progress) done += (INSTAGRAM_STEPS[i].weight * lastEvt.data.progress) / 100;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  })();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="mb-8 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#111318] via-[#111318] to-[#E1306C]/5 p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F77737]/20 via-[#E1306C]/20 to-[#C13584]/20 shadow-lg shadow-[#E1306C]/10">
            <Camera className="h-7 w-7 text-[#E1306C]" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#F5F5F5] tracking-tight">Instagram Intelligence</h1>
            <p className="mt-2 text-[15px] text-[#A1A1AA] leading-relaxed max-w-2xl">
              Extract insights from Reels, Posts, and Stories. OCR text from images, transcribe audio, and build searchable knowledge.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E1306C]/10 px-3 py-1.5 text-[11px] font-medium text-[#E1306C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E1306C]" />
                Instagram
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Playwright Browser
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                OCR + Whisper
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                No Login Required
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6 rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Post or Reel URL</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://instagram.com/reel/..."
              disabled={isStreaming}
              className="w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#171A22] py-3.5 pl-11 pr-11 text-[14px] text-[#F5F5F5] placeholder-[#52525B] outline-none transition-all focus:border-[#E1306C]/50 focus:ring-2 focus:ring-[#E1306C]/10 disabled:opacity-50"
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
              className="flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#F77737] via-[#E1306C] to-[#C13584] px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#E1306C]/10 hover:shadow-[#E1306C]/20"
            >
              <Camera className="h-4 w-4" />
              Process Post
            </button>
          )}
        </div>
        <p className="mt-3 text-[12px] text-[#52525B]">
          Works with public posts, Reels, and carousel images. No login required. Playwright renders the page to extract content.
        </p>
      </div>

      {/* Processing header */}
      {!isIdle && (
        <div className="mb-6">
          <ProcessingHeader
            sourceType="instagram"
            title={result?.title || url}
            startedAt={startedAt}
            totalSteps={INSTAGRAM_STEPS.length}
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
              {!isIdle && <span className="rounded-full bg-[#E1306C]/10 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#E1306C]">{completedSteps}/{INSTAGRAM_STEPS.length}</span>}
            </div>
            <PipelineTimeline steps={INSTAGRAM_STEPS} events={events} isStreaming={isStreaming} error={error} isIdle={isIdle} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LivePreview events={events} isStreaming={isStreaming} isIdle={isIdle} sourceType="instagram" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AnalyticsPanel events={events} steps={INSTAGRAM_STEPS} isStreaming={isStreaming} isIdle={isIdle} startedAt={startedAt} />
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
            const params = new URLSearchParams({ source: "instagram", sourceId: ctx.sourceId, title: ctx.title, summary: ctx.summary });
            router.push(`/chat?${params.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
