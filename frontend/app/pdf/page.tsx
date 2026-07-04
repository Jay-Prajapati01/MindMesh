"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/useSSE";
import { ProcessingHeader, PipelineTimeline, LivePreview, AnalyticsPanel, ResultSection } from "@/components/processing";
import { UploadZone } from "@/components/UploadZone";
import { FileText, Loader2, X, Upload } from "lucide-react";

const PDF_STEPS = [
  { id: "validate", name: "1. Validating PDF", icon: "check", description: "Checking format, size, and encryption...", weight: 3 },
  { id: "detect", name: "2. Detecting Document Type", icon: "search", description: "Analyzing document structure and metadata...", weight: 2 },
  { id: "layout", name: "3. Parsing Layout", icon: "layout", description: "Extracting structure using Docling document intelligence...", weight: 12 },
  { id: "ocr", name: "4. Running OCR", icon: "scan", description: "PaddleOCR processing scanned pages...", weight: 15 },
  { id: "tables", name: "5. Extracting Tables", icon: "table", description: "Detecting and extracting table structures...", weight: 5 },
  { id: "images", name: "6. Extracting Images", icon: "image", description: "Identifying images and figures...", weight: 3 },
  { id: "headings", name: "7. Detecting Headings", icon: "heading", description: "Building document hierarchy...", weight: 3 },
  { id: "structure", name: "8. Creating Structured Content", icon: "layers", description: "Assembling markdown representation...", weight: 3 },
  { id: "clean", name: "9. Cleaning Document", icon: "sparkles", description: "Normalizing text and fixing artifacts...", weight: 3 },
  { id: "summary", name: "10. Generating Summary", icon: "brain", description: "AI summarizing content using Ollama...", weight: 20 },
  { id: "chunking", name: "11. Semantic Chunking", icon: "scissors", description: "Splitting by headings and sentences...", weight: 5 },
  { id: "embeddings", name: "12. Creating Embeddings", icon: "vector", description: "Generating vector embeddings...", weight: 15 },
  { id: "indexing", name: "13. Indexing to Vector DB", icon: "database", description: "Storing in Qdrant and building knowledge graph...", weight: 11 },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PdfPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const { events, isStreaming, error, result, startFileStream, cancel, startedAt } = useSSE("pdf");

  const isIdle = !isStreaming && events.length === 0 && !error;

  const handleProcess = () => {
    if (!file) return;
    startFileStream(`${API_URL}/api/pdf/process/stream`, file);
  };

  let completedSteps = 0, activeStep = 0, failedStep = 0, activeStepName = "";
  const hasComplete = events.some((e) => e.event === "complete");
  for (const evt of events) {
    if (evt.event === "step_complete") completedSteps++;
    if (evt.event === "step_start") { activeStep = evt.data.step || 0; activeStepName = PDF_STEPS[(evt.data.step || 1) - 1]?.name || ""; }
    if (evt.event === "step_fail") failedStep = evt.data.step || 0;
  }
  if (hasComplete) completedSteps = PDF_STEPS.length;

  const overallProgress = (() => {
    if (events.some((e) => e.event === "complete")) return 100;
    let total = 0, done = 0;
    for (let i = 0; i < PDF_STEPS.length; i++) {
      total += PDF_STEPS[i].weight;
      const stepNum = i + 1;
      const lastEvt = [...events].reverse().find((e) => e.data?.step === stepNum);
      if (lastEvt?.event === "step_complete") done += PDF_STEPS[i].weight;
      else if (lastEvt?.event === "step_progress" && lastEvt.data.progress) done += (PDF_STEPS[i].weight * lastEvt.data.progress) / 100;
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  })();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="mb-8 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#111318] via-[#111318] to-[#DC2626]/5 p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-[#DC2626]/10 shadow-lg shadow-[#DC2626]/5">
            <FileText className="h-7 w-7 text-[#DC2626]" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#F5F5F5] tracking-tight">PDF Intelligence</h1>
            <p className="mt-2 text-[15px] text-[#A1A1AA] leading-relaxed max-w-2xl">
              Transform books, papers, and notes into queryable knowledge. Docling document intelligence, PaddleOCR for scanned pages, table extraction, and semantic chunking.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DC2626]/10 px-3 py-1.5 text-[11px] font-medium text-[#DC2626]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
                PDF
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Docling
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                PaddleOCR
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Tables & Headings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
        <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Upload PDF</label>
        <UploadZone file={file} accept="application/pdf" label="Click to choose a PDF or drag & drop" onSelect={setFile} disabled={isStreaming} />
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
              className="flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#DC2626] to-[#B91C1C] px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:from-[#EF4444] hover:to-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#DC2626]/10 hover:shadow-[#DC2626]/20"
            >
              <Upload className="h-4 w-4" />
              Process PDF
            </button>
          )}
          {file && (
            <div className="flex items-center gap-2 rounded-[12px] bg-[#171A22] px-4 py-2.5">
              <FileText className="h-4 w-4 text-[#DC2626]" />
              <span className="text-[12px] text-[#A1A1AA] max-w-[200px] truncate">{file.name}</span>
              <span className="text-[11px] text-[#52525B]">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-[12px] text-[#52525B]">
          Supports books, research papers, lecture notes, and scanned documents. OCR will be used for image-based pages.
        </p>
      </div>

      {/* Processing header */}
      {!isIdle && (
        <div className="mb-6">
          <ProcessingHeader
            sourceType="pdf"
            title={result?.title || file?.name || "PDF"}
            startedAt={startedAt}
            totalSteps={PDF_STEPS.length}
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
              {!isIdle && <span className="rounded-full bg-[#DC2626]/10 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-[#DC2626]">{completedSteps}/{PDF_STEPS.length}</span>}
            </div>
            <PipelineTimeline steps={PDF_STEPS} events={events} isStreaming={isStreaming} error={error} isIdle={isIdle} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LivePreview events={events} isStreaming={isStreaming} isIdle={isIdle} sourceType="pdf" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <AnalyticsPanel events={events} steps={PDF_STEPS} isStreaming={isStreaming} isIdle={isIdle} startedAt={startedAt} />
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
            const params = new URLSearchParams({
              source: "pdf",
              sourceId: ctx.sourceId,
              title: ctx.title,
              summary: ctx.summary,
            });
            router.push(`/chat?${params.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
