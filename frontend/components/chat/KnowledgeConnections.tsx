"use client";

import { motion } from "framer-motion";
import { Link2, ArrowRight, Network } from "lucide-react";
import { SearchHit } from "@/lib/api";

interface Props {
  sources: SearchHit[];
}

export function KnowledgeConnections({ sources }: Props) {
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.source_id, s])).values());
  const topSources = uniqueSources.slice(0, 5);

  if (topSources.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Network className="h-4 w-4 text-[#0EA5E9]" />
        <h3 className="text-[12px] font-semibold text-[#F5F5F5]">
          This answer is connected to
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {topSources.map((source, i) => (
          <motion.button
            key={source.source_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            whileHover={{ scale: 1.03, y: -1 }}
            className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] text-[#A1A1AA] transition-all hover:border-[#6E56CF]/30 hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
          >
            <Link2 className="h-3 w-3" />
            {source.title || source.source_id}
          </motion.button>
        ))}
      </div>
      <button className="mt-3 flex items-center gap-1.5 text-[11px] text-[#6E56CF] hover:text-[#7C69E3] transition-colors">
        View Relationship Graph
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
