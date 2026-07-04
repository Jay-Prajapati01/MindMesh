"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Search,
  Layers,
  Database,
  Network,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface Props {
  chunksSearched: number;
  sourcesSearched: number;
  embeddingsScanned: number;
  onSearch: (q: string) => void;
}

const BROADER_QUERIES = [
  "Try a broader term",
  "Use related concepts",
  "Search by category",
  "Ask AI to find connections",
];

export function SearchNoResults({
  chunksSearched,
  sourcesSearched,
  embeddingsScanned,
  onSearch,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center py-12"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-[rgba(255,255,255,0.03)]">
        <Search className="h-10 w-10 text-[#52525B]" />
      </div>

      <h2 className="mb-2 text-[18px] font-bold text-[#F5F5F5]">
        No exact semantic matches found
      </h2>
      <p className="mb-6 max-w-md text-center text-[13px] text-[#71717A]">
        The AI searched through your entire knowledge base but couldn&apos;t find
        closely matching content. Here&apos;s what was scanned:
      </p>

      <div className="mb-8 flex items-center gap-6 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-6 py-4">
        {[
          { icon: Layers, label: "Chunks", value: chunksSearched, color: "#6E56CF" },
          { icon: Database, label: "Sources", value: sourcesSearched, color: "#22C55E" },
          { icon: Network, label: "Embeddings", value: embeddingsScanned, color: "#0EA5E9" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#F5F5F5]">
                {stat.value}
              </div>
              <div className="text-[10px] text-[#71717A]">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 w-full max-w-sm space-y-2">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          Suggestions
        </h3>
        {BROADER_QUERIES.map((query) => (
          <button
            key={query}
            onClick={() => onSearch(query)}
            className="flex w-full items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 text-left text-[12px] text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
          >
            <ArrowRight className="h-3.5 w-3.5 text-[#52525B]" />
            {query}
          </button>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex items-center gap-2 rounded-[14px] bg-[#6E56CF] px-5 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#7C69E3]"
      >
        <Sparkles className="h-4 w-4" />
        Ask AI anyway
      </motion.button>
    </motion.div>
  );
}
