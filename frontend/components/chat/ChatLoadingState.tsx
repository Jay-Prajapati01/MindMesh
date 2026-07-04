"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Network,
  Sparkles,
  Zap,
  Check,
  Loader2,
} from "lucide-react";

const LOADING_STEPS = [
  "Thinking...",
  "Searching semantic memory...",
  "Scanning embeddings...",
  "Retrieving related chunks...",
  "Ranking relevance...",
  "Generating grounded answer...",
  "Rendering citations...",
];

export function ChatLoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Timeline loading */}
      <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#6E56CF]/15">
            <Brain className="h-3.5 w-3.5 text-[#6E56CF]" />
          </div>
          <span className="text-[12px] font-semibold text-[#6E56CF]">AI Reasoning...</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6E56CF]" />
        </div>
        <div className="mt-3 space-y-1.5 pl-9">
          {LOADING_STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;

            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2"
              >
                {done ? (
                  <Check className="h-3 w-3 text-[#22C55E]" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[#6E56CF]" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-[rgba(255,255,255,0.06)]" />
                )}
                <span
                  className={`text-[12px] ${
                    done ? "text-[#22C55E]" : active ? "text-[#6E56CF] animate-pulse" : "text-[#52525B]"
                  }`}
                >
                  {step}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Answer skeleton */}
      <div className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
        <div className="border-b border-[rgba(255,255,255,0.04)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-8 w-8 rounded-[10px]" />
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-48 rounded-md" />
              <div className="skeleton h-3 w-64 rounded-md" />
            </div>
          </div>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div className="skeleton h-4 w-full rounded-md" />
          <div className="skeleton h-4 w-5/6 rounded-md" />
          <div className="skeleton h-4 w-4/6 rounded-md" />
          <div className="skeleton h-4 w-full rounded-md" />
          <div className="skeleton h-4 w-3/4 rounded-md" />
        </div>
      </div>
    </motion.div>
  );
}
