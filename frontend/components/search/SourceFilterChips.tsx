"use client";

import { motion } from "framer-motion";
import {
  Youtube,
  Instagram,
  FileText,
  Files,
  Mic,
  Globe,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { SOURCE_TYPES } from "@/lib/api";

interface Props {
  filter: string;
  setFilter: (f: string) => void;
  stats?: Record<string, number>;
}

const SOURCE_CONFIG: Record<string, { icon: typeof Youtube; label: string; color: string }> = {
  "": { icon: Layers, label: "All Sources", color: "#6E56CF" },
  youtube: { icon: Youtube, label: "YouTube", color: "#EF4444" },
  instagram: { icon: Instagram, label: "Instagram", color: "#E1306C" },
  pdf: { icon: FileText, label: "PDF", color: "#DC2626" },
  document: { icon: Files, label: "Document", color: "#7C3AED" },
  audio: { icon: Mic, label: "Audio", color: "#059669" },
  web: { icon: Globe, label: "Web", color: "#0EA5E9" },
};

export function SourceFilterChips({ filter, setFilter, stats }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-wrap items-center gap-2"
    >
      {SOURCE_TYPES.map((f) => {
        const config = SOURCE_CONFIG[f] || SOURCE_CONFIG[""];
        const Icon = config.icon;
        const active = filter === f;
        const count = f === "" ? undefined : stats?.[f];

        return (
          <motion.button
            key={f || "all"}
            onClick={() => setFilter(f)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium transition-all duration-200 ${
              active
                ? "bg-[#6E56CF] text-white shadow-lg shadow-[#6E56CF]/20"
                : "border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5]"
            }`}
          >
            <Icon
              className="h-3.5 w-3.5"
              style={{ color: active ? "white" : config.color }}
            />
            <span>{config.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[rgba(255,255,255,0.06)] text-[#71717A]"
                }`}
              >
                {count}
              </span>
            )}
          </motion.button>
        );
      })}

      <button className="ml-1 flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[12px] text-[#71717A] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#A1A1AA]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
      </button>
    </motion.div>
  );
}
