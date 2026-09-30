"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, TrendingUp } from "lucide-react";
import { Stats } from "@/lib/api";
import { AnimatedCounter } from "@/components/search/AnimatedCounter";

interface Props {
  stats?: Stats;
  isLoading: boolean;
}

export function AISummaryBrief({ stats, isLoading }: Props) {
  const brief = useMemo(() => {
    if (!stats) return null;
    const chunks = stats.indexed_chunks;
    const sources = stats.total_sources;
    const types = Object.keys(stats.sources_by_type).length;
    return { chunks, sources, types };
  }, [stats]);

  if (isLoading && !brief) {
    return (
      <div className="mt-4 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-24 animate-pulse rounded bg-[rgba(255,255,255,0.05)]" />
        ))}
      </div>
    );
  }

  if (!brief) return null;

  const items = [
    { label: "sources indexed", value: brief.sources, color: "#22C55E" },
    { label: "knowledge chunks", value: brief.chunks, color: "#0EA5E9" },
    { label: "content types", value: brief.types, color: "#F59E0B" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-[#6E56CF]" />
        <span className="text-[12px] text-[#71717A]">Your AI has</span>
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <Check className="h-3 w-3" style={{ color: item.color }} />
          <span className="text-[12px] font-semibold text-[#F5F5F5]">
            <AnimatedCounter value={item.value} />
          </span>
          <span className="text-[11px] text-[#71717A]">{item.label}</span>
        </div>
      ))}
    </motion.div>
  );
}
