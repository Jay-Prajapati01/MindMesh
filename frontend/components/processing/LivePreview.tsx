"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { SSEEvent } from "@/hooks/useSSE";

interface LivePreviewProps {
  events: SSEEvent[];
  isStreaming: boolean;
  isIdle: boolean;
  sourceType: string;
}

const STAGE_LABELS: Record<string, Record<number, string>> = {
  youtube: { 2: "Fetching metadata...", 3: "Fetching transcript...", 4: "Generating summary...", 5: "Chunking content...", 6: "Creating embeddings...", 7: "Indexing..." },
  instagram: { 2: "Fetching post data...", 3: "Generating summary...", 4: "Chunking content...", 5: "Creating embeddings...", 6: "Indexing..." },
  pdf: { 2: "Extracting text...", 3: "Generating summary...", 4: "Chunking content...", 5: "Creating embeddings...", 6: "Indexing..." },
  document: { 2: "Extracting text...", 3: "Generating summary...", 4: "Chunking content...", 5: "Creating embeddings...", 6: "Indexing..." },
  audio: { 2: "Transcribing audio...", 3: "Generating summary...", 4: "Chunking content...", 5: "Creating embeddings...", 6: "Indexing..." },
  web: { 1: "Validating URL...", 2: "Fetching & extracting content...", 3: "Generating AI summary...", 4: "Creating embeddings...", 5: "Indexing to vector DB..." },
};

export function LivePreview({ events, isStreaming, isIdle, sourceType }: LivePreviewProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [duration, setDuration] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreamingSummary, setIsStreamingSummary] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [topics, setTopics] = useState<string[]>([]);
  const [previewChars, setPreviewChars] = useState<number | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const processedIdx = useRef(0);

  useEffect(() => {
    const newEvents = events.slice(processedIdx.current);
    processedIdx.current = events.length;
    for (const evt of newEvents) {
      const d = evt.data;
      switch (evt.event) {
        case "step_complete":
          if (d.thumbnail) setThumbnail(d.thumbnail);
          if (d.title) setTitle(d.title);
          if (d.channel) setChannel(d.channel);
          if (d.duration) setDuration(d.duration);
          if (d.summary) { setSummary(d.summary); setIsStreamingSummary(false); }
          if (d.topics) setTopics(d.topics);
          if (d.chars) setPreviewChars(d.chars);
          break;
        case "preview":
          if (d.thumbnail) setThumbnail(d.thumbnail);
          if (d.title) setTitle(d.title);
          if (d.channel) setChannel(d.channel);
          if (d.text) setTranscript(d.text);
          if (d.chars) setPreviewChars(d.chars);
          break;
        case "stream_token":
          setIsStreamingSummary(true);
          setStreamingText((p) => p + (d.token || ""));
          break;
        case "complete":
          if (d.title) setTitle(d.title);
          if (d.summary) { setSummary(d.summary); setIsStreamingSummary(false); }
          if (d.key_topics) setTopics(d.key_topics);
          break;
      }
    }
  }, [events]);

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
    }
  }, [streamingText, summary]);

  const isComplete = events.some((e) => e.event === "complete");
  const hasFailed = events.some((e) => e.event === "step_fail");

  const currentStage = useMemo(() => {
    if (isComplete) return "done";
    if (hasFailed) return "failed";
    const labels = STAGE_LABELS[sourceType] || STAGE_LABELS.web;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].event === "step_start") {
        const step = events[i].data.step;
        return labels[step] || events[i].data.description || "Processing...";
      }
    }
    if (isStreaming) return "connecting";
    return "waiting";
  }, [events, sourceType, isComplete, hasFailed, isStreaming]);

  const displaySummary = summary || streamingText;
  const isVideo = sourceType === "youtube" || sourceType === "instagram";

  if (isIdle) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171A22]">
            <span className="text-xl">👁️</span>
          </div>
          <p className="text-[13px] font-medium text-[#A1A1AA]">Live Preview</p>
          <p className="mt-1 text-[11px] text-[#71717A]">Content appears here during processing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-3 py-2">
        <span className={`h-1.5 w-1.5 rounded-full ${isComplete ? "bg-[#22C55E]" : hasFailed ? "bg-[#EF4444]" : "bg-[#6E56CF] animate-pulse"}`} />
        <span className="text-[11px] font-medium text-[#A1A1AA]">
          {currentStage === "waiting" ? "Initializing..." :
           currentStage === "connecting" ? "Connecting..." :
           currentStage === "done" ? "Complete" :
           currentStage === "failed" ? "Failed" :
           currentStage}
        </span>
      </div>

      {thumbnail && (
        <div className="animate-fade-in overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
          <div className="relative">
            <img src={thumbnail} alt={title} className="h-40 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent" />
            {duration && (
              <span className="absolute bottom-2 right-2 rounded-[8px] bg-black/70 px-2 py-0.5 text-[10px] tabular-nums font-semibold text-white">
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="p-3.5">
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] line-clamp-2 leading-tight">{title}</h3>
            {channel && <p className="mt-1 text-[11px] text-[#71717A]">{channel}</p>}
          </div>
        </div>
      )}

      {!thumbnail && title && (
        <div className="animate-fade-in rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <h3 className="text-[13px] font-semibold text-[#F5F5F5] line-clamp-2 leading-tight">{title}</h3>
          {previewChars != null && previewChars > 0 && <p className="mt-1 text-[11px] text-[#71717A]">{previewChars.toLocaleString()} characters extracted</p>}
        </div>
      )}

      {transcript && (
        <div className="animate-fade-in rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
              {isVideo ? "Transcript" : "Extracted Content"}
            </span>
            <span className="text-[10px] tabular-nums text-[#71717A]">{transcript.length.toLocaleString()} chars</span>
          </div>
          <div className="max-h-36 overflow-y-auto rounded-[10px] bg-[#171A22] p-3">
            <p className="text-[11px] leading-relaxed text-[#A1A1AA] whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
      )}

      {displaySummary && (
        <div className="animate-fade-in rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">AI Summary</span>
            {isStreamingSummary && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#6E56CF]">
                <span className="h-1 w-1 rounded-full bg-[#6E56CF] animate-pulse" />
                Streaming
              </span>
            )}
          </div>
          <div ref={summaryRef} className="max-h-48 overflow-y-auto rounded-[10px] bg-[#171A22] p-3">
            <p className={`text-[12px] leading-relaxed text-[#A1A1AA] whitespace-pre-wrap ${isStreamingSummary ? "streaming-cursor" : ""}`}>
              {displaySummary}
            </p>
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <div className="animate-fade-in rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Key Topics</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span key={t} className="rounded-full bg-[#6E56CF]/10 px-2.5 py-1 text-[10px] font-medium text-[#6E56CF]">{t}</span>
            ))}
          </div>
        </div>
      )}

      {!thumbnail && !title && !transcript && !displaySummary && isStreaming && (
        <div className="flex h-48 items-center justify-center rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
          <div className="text-center">
            <div className="mx-auto mb-2 h-5 w-5 rounded-full border-2 border-[#6E56CF] border-t-transparent animate-spin" />
            <p className="text-[11px] text-[#71717A]">
              {currentStage === "connecting" ? "Connecting to server..." : "Waiting for content..."}
            </p>
          </div>
        </div>
      )}

      {isComplete && !thumbnail && !transcript && !displaySummary && (
        <div className="flex h-48 items-center justify-center rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E]/20">
              <svg className="h-5 w-5 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-[#A1A1AA]">Content processed</p>
            <p className="mt-1 text-[11px] text-[#71717A]">Indexed and ready for search</p>
          </div>
        </div>
      )}

      {hasFailed && !thumbnail && !transcript && !displaySummary && (
        <div className="flex h-48 items-center justify-center rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#EF4444]/20">
              <svg className="h-5 w-5 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-[#A1A1AA]">Processing failed</p>
            <p className="mt-1 text-[11px] text-[#71717A]">Check error details below</p>
          </div>
        </div>
      )}
    </div>
  );
}
