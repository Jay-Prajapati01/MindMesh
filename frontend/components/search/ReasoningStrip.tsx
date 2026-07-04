"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Brain, Search, Network, Sparkles, Zap } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

interface PipelineStep {
  label: string;
  detail: string;
  icon: typeof Brain;
}

interface Props {
  loading: boolean;
  chunksSearched?: number;
  sourcesSearched?: number;
  embeddingsScanned?: number;
  resultCount?: number;
  searchTimeMs?: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { label: "Query Embedded", detail: "1024 dimensions", icon: Brain },
  { label: "Vector Search", detail: "scanning embeddings", icon: Search },
  { label: "AI Re-ranking", detail: "complete", icon: Sparkles },
  { label: "Knowledge Graph", detail: "expanded", icon: Network },
  { label: "Results Ranked", detail: "semantic matching", icon: Zap },
];

export function ReasoningStrip({
  loading,
  chunksSearched = 0,
  sourcesSearched = 0,
  embeddingsScanned = 0,
  resultCount = 0,
  searchTimeMs = 0,
}: Props) {
  const [completedSteps, setCompletedSteps] = useState<number>(0);

  useEffect(() => {
    if (!loading) {
      setCompletedSteps(PIPELINE_STEPS.length);
      return;
    }
    setCompletedSteps(0);
    const timers = PIPELINE_STEPS.map((_, i) =>
      setTimeout(() => setCompletedSteps(i + 1), (i + 1) * 250)
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  if (!loading && completedSteps === 0 && resultCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318]"
    >
      <div className="flex items-center gap-6 px-5 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#6E56CF]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            AI Pipeline
          </span>
        </div>

        <div className="flex flex-1 items-center gap-1">
          {PIPELINE_STEPS.map((step, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps && loading;
            const Icon = step.icon;

            return (
              <div key={step.label} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5">
                  {done ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E]/15">
                      <Check className="h-3 w-3 text-[#22C55E]" />
                    </div>
                  ) : active ? (
                    <div className="flex h-5 w-5 items-center justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6E56CF]" />
                    </div>
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]">
                      <Icon className="h-3 w-3 text-[#52525B]" />
                    </div>
                  )}
                  <span
                    className={`text-[11px] font-medium ${
                      done
                        ? "text-[#22C55E]"
                        : active
                        ? "text-[#6E56CF]"
                        : "text-[#52525B]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-px w-4 ${
                      done ? "bg-[#22C55E]/30" : "bg-[rgba(255,255,255,0.06)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {!loading && resultCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 text-[11px]"
          >
            <span className="text-[#71717A]">
              <AnimatedCounter value={chunksSearched} /> chunks
            </span>
            <span className="text-[#71717A]">
              <AnimatedCounter value={sourcesSearched} /> sources
            </span>
            <span className="text-[#71717A]">
              <AnimatedCounter value={embeddingsScanned} /> embeddings
            </span>
            <span className="text-[#71717A]">
              Completed in <AnimatedCounter value={searchTimeMs} /> ms
            </span>
          </motion.div>
        )}

        {loading && (
          <span className="text-[11px] text-[#71717A] animate-pulse">
            Processing...
          </span>
        )}
      </div>
    </motion.div>
  );
}
