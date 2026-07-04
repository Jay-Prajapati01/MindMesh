"use client";

import { useMemo } from "react";
import { Badge, Card } from "@/components/ui";
import { SSEEvent } from "@/hooks/useSSE";

interface StepConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  weight: number;
}

interface StepState {
  status: "pending" | "active" | "complete" | "error";
  progress?: number;
  subText?: string;
  preview?: Record<string, any>;
  durationMs?: number;
  error?: string;
}

interface ProcessingTimelineProps {
  steps: StepConfig[];
  events: SSEEvent[];
  isStreaming: boolean;
  error: string | null;
}

function getIcon(icon: string): string {
  const icons: Record<string, string> = {
    link: "🔗",
    info: "📋",
    subtitles: "💬",
    brain: "🧠",
    scissors: "✂️",
    vector: "📊",
    database: "💾",
    play: "▶️",
    headphones: "🎧",
    globe: "🌐",
    upload: "📤",
    scan: "🔍",
    file: "📄",
    search: "🔎",
    load: "⏳",
    mic: "🎤",
    document: "📝",
  };
  return icons[icon] || "⚙️";
}

function StepCard({ step, state, isLast, isIdle = false }: { step: StepConfig; state: StepState; isLast: boolean; isIdle?: boolean }) {
  const statusColors = {
    pending: isIdle ? "border-gray-800/50 bg-gray-900/30" : "border-gray-700 bg-gray-900/50",
    active: "border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10",
    complete: "border-emerald-500/30 bg-emerald-950/20",
    error: "border-red-500/30 bg-red-950/20",
  };

  const statusIcons = {
    pending: (
      <div className={`rounded-full border-2 ${isIdle ? "border-gray-700 bg-gray-800/50 h-4 w-4" : "border-gray-600 h-5 w-5"}`} />
    ),
    active: (
      <div className="relative h-5 w-5">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-30" />
        <div className="absolute inset-0 rounded-full border-2 border-blue-500 bg-blue-500/20" />
        <div className="absolute inset-1.5 rounded-full bg-blue-500" />
      </div>
    ),
    complete: (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    error: (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
  };

  return (
    <div className="relative flex gap-4">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[9px] top-6 h-full w-0.5">
          <div
            className={`h-full w-full transition-all duration-500 ${
              isIdle
                ? "bg-gray-800"
                : state.status === "complete"
                ? "bg-emerald-500"
                : state.status === "active"
                ? "bg-gradient-to-b from-blue-500 to-gray-700"
                : "bg-gray-700"
            }`}
          />
        </div>
      )}

      {/* Status icon */}
      <div className="relative z-10 mt-1 flex-shrink-0">
        {statusIcons[state.status]}
      </div>

      {/* Step content */}
      <div className={`mb-4 flex-1 rounded-lg border p-3 transition-all duration-300 ${statusColors[state.status]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{getIcon(step.icon)}</span>
            <span className={`text-sm font-medium ${
              isIdle
                ? "text-gray-600"
                : state.status === "complete"
                ? "text-emerald-300"
                : state.status === "active"
                ? "text-blue-300"
                : state.status === "error"
                ? "text-red-300"
                : "text-gray-400"
            }`}>
              {step.name}
            </span>
          </div>
          {state.durationMs !== undefined && (
            <span className="text-xs text-gray-500">
              {(state.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Active step details */}
        {state.status === "active" && (
          <div className="mt-2">
            <p className="text-xs text-gray-400">{step.description}</p>
            {state.subText && (
              <p className="mt-1 text-xs text-blue-300/70">{state.subText}</p>
            )}
            {state.progress !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{state.subText || "Progress"}</span>
                  <span>{state.progress}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {state.status === "error" && state.error && (
          <p className="mt-1 text-xs text-red-400">{state.error}</p>
        )}

        {/* Preview (thumbnail, text) */}
        {state.preview && state.status === "complete" && (
          <PreviewCard preview={state.preview} stepId={step.id} />
        )}
      </div>
    </div>
  );
}

function PreviewCard({ preview, stepId }: { preview: Record<string, any>; stepId: string }) {
  if (stepId === "metadata" && preview.thumbnail) {
    return (
      <div className="mt-2 rounded-lg border border-gray-700/50 bg-gray-800/50 p-2">
        <div className="flex gap-3">
          <img
            src={preview.thumbnail}
            alt={preview.title || "Thumbnail"}
            className="h-16 w-28 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-200">{preview.title}</p>
            <p className="text-xs text-gray-400">{preview.channel}</p>
            {preview.duration && (
              <p className="text-xs text-gray-500">
                {Math.floor(preview.duration / 60)}:{(preview.duration % 60).toString().padStart(2, "0")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (preview.text) {
    return (
      <div className="mt-2 rounded-lg border border-gray-700/50 bg-gray-800/50 p-2">
        <p className="text-xs leading-relaxed text-gray-300 line-clamp-3">
          {preview.text}
        </p>
        {preview.chars && (
          <p className="mt-1 text-xs text-gray-500">
            {preview.chars.toLocaleString()} characters
          </p>
        )}
      </div>
    );
  }

  if (preview.chunk_count !== undefined) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <Badge>{preview.chunk_count} chunks</Badge>
        {preview.vectors_count !== undefined && (
          <Badge>{preview.vectors_count} vectors</Badge>
        )}
      </div>
    );
  }

  return null;
}

export function ProcessingTimeline({
  steps,
  events,
  isStreaming,
  error,
}: ProcessingTimelineProps) {
  const stepStates = useMemo(() => {
    const states: Record<string, StepState> = {};

    for (const step of steps) {
      states[step.id] = { status: "pending" };
    }

    for (const evt of events) {
      const d = evt.data;
      const stepIdx = (d.step || 1) - 1;
      const stepId = steps[stepIdx]?.id;
      if (!stepId) continue;

      switch (evt.event) {
        case "step_start":
          states[stepId] = {
            ...states[stepId],
            status: "active",
            subText: d.description,
          };
          break;

        case "step_progress":
          if (states[stepId].status === "active") {
            states[stepId] = {
              ...states[stepId],
              progress: d.progress,
              subText: d.sub_text || states[stepId].subText,
            };
          }
          break;

        case "step_complete":
          states[stepId] = {
            ...states[stepId],
            status: "complete",
            progress: 100,
            durationMs: d.duration_ms,
            preview: Object.fromEntries(
              Object.entries(d).filter(([k]) => k !== "step" && k !== "duration_ms")
            ),
          };
          break;

        case "step_fail":
          states[stepId] = {
            ...states[stepId],
            status: "error",
            error: d.error,
          };
          break;

        case "preview": {
          // Map preview types to step IDs (thumbnail -> metadata, transcript -> transcript)
          const typeMap: Record<string, string> = {
            thumbnail: "metadata",
            transcript: "transcript",
          };
          const targetStepId = d.type ? typeMap[d.type] : null;
          const effectiveId = targetStepId && states[targetStepId] ? targetStepId : stepId;
          states[effectiveId] = {
            ...states[effectiveId],
            preview: d,
          };
          break;
        }
      }
    }

    return states;
  }, [steps, events, error]);

  const overallProgress = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const step of steps) {
      total += step.weight;
      const state = stepStates[step.id];
      if (state.status === "complete") {
        completed += step.weight;
      } else if (state.status === "active" && state.progress !== undefined) {
        completed += (step.weight * state.progress) / 100;
      }
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [steps, stepStates]);

  const isIdle = !isStreaming && events.length === 0 && !error;

  return (
    <Card className="mt-4">
      {/* Overall progress header */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-200">
            {isIdle ? "Pipeline Overview" : isStreaming ? "Processing..." : error ? "Failed" : "Complete"}
          </span>
          <span className="text-gray-400">
            {isIdle ? `${steps.length} steps` : `${overallProgress}%`}
          </span>
        </div>
        {!isIdle && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                error
                  ? "bg-red-500"
                  : overallProgress === 100
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Timeline steps */}
      <div className="space-y-0">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            state={stepStates[step.id]}
            isLast={i === steps.length - 1}
            isIdle={isIdle}
          />
        ))}
      </div>
    </Card>
  );
}
