"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Sparkles,
  FileText,
  Globe,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

interface Props {
  onSearch: (q: string) => void;
}

const SUGGESTED_SEARCHES = [
  { icon: Brain, label: "What are the key insights from my notes?", color: "#6E56CF" },
  { icon: Sparkles, label: "Summarize my latest YouTube videos", color: "#EF4444" },
  { icon: FileText, label: "What topics appear most in my PDFs?", color: "#DC2626" },
  { icon: Globe, label: "Find connections between my web articles", color: "#0EA5E9" },
];

const POPULAR_TOPICS = [
  "AI Agents",
  "Machine Learning",
  "Productivity",
  "Knowledge Graphs",
  "Note-taking",
  "Research",
  "Content Creation",
  "Developer Tools",
];

const TRENDING_ENTITIES = [
  "NotebookLM",
  "OpenAI",
  "Cursor",
  "LangChain",
  "Vector Database",
  "RAG",
];

export function SearchEmptyState({ onSearch }: Props) {
  const recentSearches = useAppStore((s) => s.recentSearches);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center py-12"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#6E56CF]/15 to-[#6E56CF]/5">
        <Brain className="h-10 w-10 text-[#6E56CF]" />
      </div>

      <h2 className="mb-2 text-[20px] font-bold text-[#F5F5F5]">
        Explore Your Intelligence
      </h2>
      <p className="mb-8 max-w-md text-center text-[13px] text-[#71717A]">
        Search across all your knowledge sources. Ask questions, find connections,
        and discover insights hidden in your data.
      </p>

      {/* Suggested Searches */}
      <div className="mb-8 w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <Sparkles className="h-3.5 w-3.5 text-[#6E56CF]" />
          Suggested Searches
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTED_SEARCHES.map((suggestion) => (
            <motion.button
              key={suggestion.label}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSearch(suggestion.label)}
              className="flex items-center gap-3 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5 text-left transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.03)]"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `${suggestion.color}15` }}
              >
                <suggestion.icon
                  className="h-4 w-4"
                  style={{ color: suggestion.color }}
                />
              </div>
              <span className="text-[12px] text-[#A1A1AA]">{suggestion.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="mb-8 w-full max-w-2xl">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
            <Clock className="h-3.5 w-3.5" />
            Recently Searched
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 6).map((search) => (
              <button
                key={search}
                onClick={() => onSearch(search)}
                className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-[11px] text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5]"
              >
                <Clock className="h-3 w-3 text-[#52525B]" />
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Topics */}
      <div className="mb-8 w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <TrendingUp className="h-3.5 w-3.5" />
          Popular Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => onSearch(topic)}
              className="rounded-full bg-[rgba(255,255,255,0.04)] px-3.5 py-1.5 text-[11px] text-[#71717A] transition-all hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Entities */}
      <div className="w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <Zap className="h-3.5 w-3.5" />
          Trending Entities
        </h3>
        <div className="flex flex-wrap gap-2">
          {TRENDING_ENTITIES.map((entity) => (
            <button
              key={entity}
              onClick={() => onSearch(entity)}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-[11px] text-[#A1A1AA] transition-all hover:border-[#6E56CF]/30 hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
            >
              <Zap className="h-3 w-3 text-[#F59E0B]" />
              {entity}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
