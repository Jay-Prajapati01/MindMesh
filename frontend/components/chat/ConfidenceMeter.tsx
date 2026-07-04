"use client";

import { motion } from "framer-motion";
import { Shield, TrendingUp } from "lucide-react";

interface Props {
  confidence: number;
  sourcesCount: number;
  chunksCount: number;
  embeddingsCount: number;
}

function getConfidenceColor(c: number) {
  if (c >= 85) return "#22C55E";
  if (c >= 70) return "#F59E0B";
  return "#EF4444";
}

function getConfidenceLabel(c: number) {
  if (c >= 85) return "High Confidence";
  if (c >= 70) return "Moderate Confidence";
  return "Low Confidence";
}

export function ConfidenceMeter({ confidence, sourcesCount, chunksCount, embeddingsCount }: Props) {
  const color = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" style={{ color }} />
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Answer Confidence</span>
        </div>
        <span className="text-[20px] font-bold tabular-nums" style={{ color }}>
          {confidence}%
        </span>
      </div>

      <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}CC)` }}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
      </div>

      <div className="space-y-2 border-t border-[rgba(255,255,255,0.04)] pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          Grounded by
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Sources", value: sourcesCount, icon: "✓" },
            { label: "Chunks", value: chunksCount, icon: "✓" },
            { label: "Embeddings", value: embeddingsCount, icon: "✓" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#22C55E]">{item.icon}</span>
              <span className="text-[11px] font-semibold text-[#F5F5F5]">{item.value}</span>
              <span className="text-[10px] text-[#71717A]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
