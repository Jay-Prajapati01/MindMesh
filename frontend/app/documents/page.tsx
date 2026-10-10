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
      <div className="mb-6 rounded-[24px] border-2 border-ink bg-gradient-to-br from-card via-card to-brand-soft p-5 sm:mb-8 sm:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-brand-soft shadow-brut">
            <FileStack className="h-7 w-7 text-brand" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">Document Intelligence</h1>
            <p className="mt-2 text-[15px] text-foreground-3 leading-relaxed max-w-2xl">
              Transform any document into searchable knowledge. DOCX, PPTX, TXT, Markdown, CSV, and Excel files supported.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Multi-Format
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                DOCX + PPTX
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                TXT + Markdown
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                CSV + Excel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 rounded-[20px] border-2 border-ink bg-card p-5">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-muted">Upload Document</label>
        <UploadZone file={file} accept={ACCEPT} label="Click to choose a document or drag & drop" onSelect={setFile} disabled={isStreaming} />
        <div className="mt-4 flex items-center gap-3">
          {isStreaming ? (
            <button
              onClick={cancel}
              className="flex items-center gap-2 brut-btn bg-danger px-6 py-3.5 text-[13px] font-bold text-card transition-all hover:bg-danger"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Cancel Processing
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!file}
              className="flex items-center gap-2 brut-btn bg-brand px-6 py-3.5 text-[13px] font-bold text-ink transition-all hover:bg-brand-hover disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4" />
              Process Document
            </button>
          )}
          {file && (
            <div className="flex items-center gap-2 rounded-[12px] border-2 border-ink bg-surface px-4 py-2.5">
              <FileStack className="h-4 w-4 text-brand" />
              <span className="text-[12px] text-foreground-3 max-w-[200px] truncate">{file.name}</span>
              <span className="text-[11px] text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-[12px] text-muted">
          Perfect for meeting notes, research papers, presentations, spreadsheets, and markdown documentation.
        </p>

        {/* Accepted document types */}
        <div className="mt-4 rounded-[14px] border-2 border-ink bg-card p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Accepted documents</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { ext: "DOCX", desc: "Word reports, resumes, notes — headings & tables preserved" },
              { ext: "PPTX", desc: "Presentations — slide titles & tables kept as sections" },
              { ext: "XLSX", desc: "Excel workbooks — one section per sheet, header table" },
              { ext: "CSV", desc: "Comma-separated data — first row treated as header" },
              { ext: "TXT", desc: "Plain text notes, transcripts, logs" },
              { ext: "MD", desc: "Markdown docs — existing headings used for chunking" },
            ].map((t) => (
              <div key={t.ext} className="flex items-start gap-2.5 rounded-[10px] bg-card px-3 py-2.5">
                <span className="mt-0.5 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                  {t.ext}
                </span>
                <span className="text-[11px] leading-snug text-muted">{t.desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Headings, tables and section structure are preserved and fed to the AI for summaries,
            semantic chunking and grounded answers. PDFs are handled by Docling on the{" "}
            <a href="/pdf" className="text-brand underline-offset-2 hover:underline">PDF page</a>.
          </p>
        </div>
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
          <div className="rounded-[20px] border-2 border-ink bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Pipeline Progress</span>
              {!isIdle && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-semibold tabular-nums text-brand">{completedSteps}/{DOCUMENT_STEPS.length}</span>}
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
        <div className="mt-6 rounded-[20px] border-2 border-danger/30 bg-danger/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-danger/10">
              <X className="h-4 w-4 text-danger" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-danger">Processing Error</p>
              <p className="text-[12px] text-muted">{error}</p>
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
