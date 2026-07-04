"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { ProcessingHeader, PipelineTimeline, LivePreview, AnalyticsPanel, ResultSection } from "@/components/processing";
import { UploadZone } from "@/components/UploadZone";
import { FileStack, Loader2, X, Upload } from "lucide-react";

const DOCUMENT_STEPS = [
  { id: "upload", name: "1. Uploading File", icon: "upload", description: "Reading document into memory...", weight: 5 },
  { id: "parse", name: "2. Parsing Document", icon: "document", description: "Extracting text from document...", weight: 10 },
  { id: "summary", name: "3. Generating Summary", icon: "brain", description: "AI summarizing content using Ollama...", weight: 35 },
  { id: "chunking", name: "4. Chunking Content", icon: "scissors", description: "Splitting text into indexable chunks...", weight: 3 },
  { id: "embeddings", name: "5. Creating Embeddings", icon: "vector", description: "Generating vector embeddings...", weight: 30 },
  { id: "indexing", name: "6. Indexing to Vector DB", icon: "database", description: "Storing in Qdrant and extracting knowledge graph...", weight: 17 },
];

const ACCEPT = ".docx,.pptx,.txt,.md,.markdown,.csv,.xlsx";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DocumentsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const { events, isStreaming, error, result, startFileStream, cancel, startedAt } = useSSE("document");

  const isIdle = !isStreaming && events.length === 0 && !error;

  const handleProcess = () => {
    if (!file) return;
    startFileStream(`${API_URL}/api/documents/process/stream`, file);
  };

  let completedSteps = 0, activeStep = 0, failedStep = 0, activeStepName = "";
  const hasComplete = events.some((e) => e.event === "complete");
  for (const evt of events) {
    if (evt.event === "step_complete") completedSteps++;
    if (evt.event === "step_start") { activeStep = evt.data.step || 0; activeStepName = DOCUMENT_STEPS[(evt.data.step || 1) - 1]?.name || ""; }
    if (evt.event === "step_fail") failedStep = evt.data.step || 0;
  }
  if (hasComplete) completedSteps = DOCUMENT_STEPS.length;

  const overallProgress = (() => {
    if (events.some((e) => e.event === "complete")) return 100;
    let total = 0, done = 0;
    for (let i = 0; i < DOCUMENT_STEPS.length; i++) {
      total += DOCUMENT_STEPS[i].weight;
      const stepNum = i + 1;
      const lastEvt = [...events].reverse().find((e) => e.data?.step === stepNum);
      if (lastEvt?.event === "step_complete") done += DOCUMENT_STEPS[i].weight;
      else if (lastEvt?.event === "step_progress" && lastEvt.data.progress) done += (DOCUMENT_STEPS[i].weight * lastEvt.data.progress) / 100;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  })();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="mb-8 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#111318] via-[#111318] to-[#7C3AED]/5 p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-[#7C3AED]/10 shadow-lg shadow-[#7C3AED]/5">
            <FileStack className="h-7 w-7 text-[#7C3AED]" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#F5F5F5] tracking-tight">Document Intelligence</h1>
            <p className="mt-2 text-[15px] text-[#A1A1AA] leading-relaxed max-w-2xl">
              Transform any document into searchable knowledge. DOCX, PPTX, TXT, Markdown, CSV, and Excel files supported.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED]/10 px-3 py-1.5 text-[11px] font-medium text-[#7C3AED]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                Multi-Format
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                DOCX + PPTX
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                TXT + Markdown
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                CSV + Excel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Upload Document</label>
        <UploadZone file={file} accept={ACCEPT} label="Click to choose a document or drag & drop" onSelect={setFile} disabled={isStreaming} />
        <div className="mt-4 flex items-center gap-3">
          {isStreaming ? (
            <button
              onClick={cancel}
              className="flex items-center gap-2 rounded-[14px] border border-[#EF4444]/30 bg-[#EF4444]/10 px-6 py-3.5 text-[13px] font-semibold text-[#EF4444] transition-all hover:bg-[#EF4444]/20 hover:border-[#EF4444]/40"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Cancel Processing
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!file}
              className="flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:from-[#8B5CF6] hover:to-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#7C3AED]/10 hover:shadow-[#7C3AED]/20"
            >
              <Upload className="h-4 w-4" />
              Process Document
            </button>
          )}
          {file && (
            <div className="flex items-center gap-2 rounded-[12px] bg-[#171A22] px-4 py-2.5">
              <FileStack className="h-4 w-4 text-[#7C3AED]" />
              <span className="text-[12px] text-[#A1A1AA] max-w-[200px] truncate">{file.name}</span>
              <span className="text-[11px] text-[#52525B]">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-[12px] text-[#52525B]">
          Perfect for meeting notes, research papers, presentations, spreadsheets, and markdown documentation.
        </p>
      </div>

      {/* Processing header */}
      {!isIdle && (
        <div className="mb-6">
          <ProcessingHeader
            sourceType="document"
            title={result?.title || file?.name || "Document"}
            startedAt={startedAt}
            totalSteps={DOCUMENT_STEPS.length}
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
              {!isIdle && <span className="rounded-full bg-[#7C3AED]/10 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#7C3AED]">{completedSteps}/{DOCUMENT_STEPS.length}</span>}
            </div>
            <PipelineTimeline steps={DOCUMENT_STEPS} events={events} isStreaming={isStreaming} error={error} isIdle={isIdle} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LivePreview events={events} isStreaming={isStreaming} isIdle={isIdle} sourceType="document" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AnalyticsPanel events={events} steps={DOCUMENT_STEPS} isStreaming={isStreaming} isIdle={isIdle} startedAt={startedAt} />
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
            const params = new URLSearchParams({ source: "documents", sourceId: ctx.sourceId, title: ctx.title, summary: ctx.summary });
            router.push(`/chat?${params.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
