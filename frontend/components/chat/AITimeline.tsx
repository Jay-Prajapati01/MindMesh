"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Check,
  Loader2,
  Search,
  Network,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
} from "lucide-react";

interface Props {
  loading: boolean;
  chunksSearched: number;
  sourcesSearched: number;
  embeddingsScanned: number;
  searchTimeMs: number;
  model: string;
  completedSteps: number;
}

const PIPELINE_STEPS = [
  { label: "Semantic Search Completed", icon: Search, detail: "Query embedded & matched" },
  { label: "Chunks Retrieved", icon: Brain, detail: "Top-K selection" },
  { label: "Embeddings Compared", icon: Network, detail: "Vector similarity" },
  { label: "Knowledge Graph Expanded", icon: Zap, detail: "Entity connections" },
  { label: "AI Re-ranking Finished", icon: Sparkles, detail: "Cross-encoder scoring" },
  { label: "Final Answer Generated", icon: Check, detail: "Grounded response" },
];

export function AITimeline({
  loading,
  chunksSearched,
  sourcesSearched,
  embeddingsScanned,
  searchTimeMs,
  model,
  completedSteps,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!loading && completedSteps === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318]"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#6E56CF]/15">
            <Brain className="h-3.5 w-3.5 text-[#6E56CF]" />
          </div>
          <span className="text-[12px] font-semibold text-[#A1A1AA]">
            {loading ? "AI Reasoning..." : "AI Reasoning Complete"}
          </span>
          {!loading && (
            <span className="flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-medium text-[#22C55E]">
              <Check className="h-3 w-3" />
              Done
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                {model}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(searchTimeMs / 1000).toFixed(1)}s
              </span>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#71717A]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#71717A]" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[rgba(255,255,255,0.04)]"
          >
            <div className="space-y-1 px-5 py-3">
              {PIPELINE_STEPS.map((step, i) => {
                const done = i < completedSteps;
                const active = i === completedSteps && loading;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
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
                        className={`text-[12px] font-medium ${
                          done ? "text-[#22C55E]" : active ? "text-[#6E56CF]" : "text-[#52525B]"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#52525B]">{step.detail}</span>
                    {done && (
                      <span className="ml-auto text-[10px] text-[#22C55E]">
                        {(searchTimeMs * (i + 1) / PIPELINE_STEPS.length / 1000).toFixed(1)}s
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
