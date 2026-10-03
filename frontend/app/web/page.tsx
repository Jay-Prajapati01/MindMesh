"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { ProcessingHeader, PipelineTimeline, LivePreview, AnalyticsPanel, ResultSection } from "@/components/processing";
import { Search, X, Globe, Loader2 } from "lucide-react";

const WEB_STEPS = [
  { id: "validate", name: "1. Validating URL", icon: "link", description: "Checking if the URL is accessible...", weight: 2 },
  { id: "fetch", name: "2. Fetching & Extracting", icon: "globe", description: "Crawling page with Crawl4AI (JS rendering, content extraction)...", weight: 20 },
  { id: "summary", name: "3. Generating Summary", icon: "brain", description: "AI summarizing content using Ollama...", weight: 35 },
  { id: "embeddings", name: "4. Creating Embeddings", icon: "vector", description: "Generating vector embeddings...", weight: 30 },
  { id: "indexing", name: "5. Indexing to Vector DB", icon: "database", description: "Storing in Qdrant and extracting knowledge graph...", weight: 13 },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function WebPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const { events, isStreaming, error, result, startStream, cancel, startedAt } = useSSE("web");

  const isIdle = !isStreaming && events.length === 0 && !error;

  const handleProcess = () => {
    if (!url) return;
    startStream(`${API_URL}/api/web/process/stream`, { url });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url && !isStreaming) handleProcess();
  };

  let completedSteps = 0, activeStep = 0, failedStep = 0, activeStepName = "";
  const hasComplete = events.some((e) => e.event === "complete");
  for (const evt of events) {
    if (evt.event === "step_complete") completedSteps++;
    if (evt.event === "step_start") { activeStep = evt.data.step || 0; activeStepName = WEB_STEPS[(evt.data.step || 1) - 1]?.name || ""; }
    if (evt.event === "step_fail") failedStep = evt.data.step || 0;
  }
  if (hasComplete) completedSteps = WEB_STEPS.length;

  const overallProgress = (() => {
    if (events.some((e) => e.event === "complete")) return 100;
    let total = 0, done = 0;
    for (let i = 0; i < WEB_STEPS.length; i++) {
      total += WEB_STEPS[i].weight;
      const stepNum = i + 1;
      const lastEvt = [...events].reverse().find((e) => e.data?.step === stepNum);
      if (lastEvt?.event === "step_complete") done += WEB_STEPS[i].weight;
      else if (lastEvt?.event === "step_progress" && lastEvt.data.progress) done += (WEB_STEPS[i].weight * lastEvt.data.progress) / 100;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  })();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="mb-8 rounded-[24px] border-2 border-ink bg-gradient-to-br from-card via-card to-brand-soft p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-brand-soft shadow-brut">
            <Globe className="h-7 w-7 text-brand" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">Web Intelligence</h1>
            <p className="mt-2 text-[15px] text-foreground-3 leading-relaxed max-w-2xl">
              Transform any article, blog, or documentation into searchable knowledge. Smart content extraction with AI summaries.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B96A00]" />
                Web
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                Crawl4AI Engine
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                Any Article
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                Smart Extraction
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6 rounded-[20px] border-2 border-ink bg-card p-5">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-muted">Article URL</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/article..."
              disabled={isStreaming}
              className="w-full rounded-[14px] border-2 border-ink bg-surface py-3.5 pl-11 pr-11 text-[14px] text-foreground placeholder:text-muted outline-none transition-all focus:border-[#B96A00]/50 focus:ring-2 focus:ring-[#B96A00]/10 disabled:opacity-50"
            />
            {url && !isStreaming && (
              <button onClick={() => setUrl("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isStreaming ? (
            <button
              onClick={cancel}
              className="flex items-center gap-2 brut-btn bg-danger px-6 py-3.5 text-[13px] font-bold text-card transition-all"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Cancel
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!url}
              className="flex items-center gap-2 brut-btn bg-brand px-6 py-3.5 text-[13px] font-bold text-ink transition-all hover:bg-brand-hover disabled:cursor-not-allowed"
            >
              <Globe className="h-4 w-4" />
              Process Article
            </button>
          )}
        </div>
        <p className="mt-3 text-[12px] text-muted">
          Works with blog posts, news articles, documentation, Medium, Dev.to, and most web content with readable text.
        </p>
      </div>

      {/* Processing header */}
      {!isIdle && (
        <div className="mb-6">
          <ProcessingHeader
            sourceType="web"
            title={result?.title || url}
            startedAt={startedAt}
            totalSteps={WEB_STEPS.length}
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
          <div className="rounded-[20px] border-2 border-ink bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Pipeline Progress</span>
              {!isIdle && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-semibold tabular-nums text-brand">{completedSteps}/{WEB_STEPS.length}</span>}
            </div>
            <PipelineTimeline steps={WEB_STEPS} events={events} isStreaming={isStreaming} error={error} isIdle={isIdle} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LivePreview events={events} isStreaming={isStreaming} isIdle={isIdle} sourceType="web" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AnalyticsPanel events={events} steps={WEB_STEPS} isStreaming={isStreaming} isIdle={isIdle} startedAt={startedAt} />
        </div>
      </div>

      {error && !isStreaming && (
        <div className="mt-6 rounded-[20px] border border-danger/30 bg-danger/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-danger/10">
              <X className="h-4 w-4 text-danger" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-danger">Processing Error</p>
              <p className="mt-1 text-[12px] text-muted">{error}</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6">
        <ResultSection
          events={events}
          isStreaming={isStreaming}
          onAskAI={(ctx) => {
            const params = new URLSearchParams({ source: "web", sourceId: ctx.sourceId, title: ctx.title, summary: ctx.summary });
            router.push(`/chat?${params.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
