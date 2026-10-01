"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Mic,
  X,
  ArrowRight,
  Sparkles,
  Command,
} from "lucide-react";

interface Props {
  query: string;
  setQuery: (q: string) => void;
  onSearch: () => void;
  loading: boolean;
  placeholder?: string;
}

export function EnhancedSearchBar({
  query,
  setQuery,
  onSearch,
  loading,
  placeholder = "Ask anything across your knowledge...",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler as any);
    return () => document.removeEventListener("keydown", handler as any);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative"
    >
      <div className="group relative flex items-center rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111318] transition-all duration-300 focus-within:border-[#6E56CF]/50 focus-within:shadow-[0_0_0_3px_rgba(110,86,207,0.15),0_0_30px_rgba(110,86,207,0.1)]">
        <div className="flex h-16 items-center pl-5">
          <Search className="h-5 w-5 text-[#71717A] transition-colors group-focus-within:text-[#6E56CF]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          size={1}
          className="h-16 min-w-0 flex-1 bg-transparent px-4 text-[15px] font-normal text-[#F5F5F5] placeholder-[#52525B] outline-none"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          className="mr-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5] sm:flex"
          title="Voice search"
          aria-label="Voice search"
        >
          <Mic className="h-4 w-4" />
        </button>

        <button
          onClick={() => query.trim() && onSearch()}
          disabled={!query.trim() || loading}
          className="mr-2 flex h-10 shrink-0 items-center gap-2 rounded-[12px] bg-[#6E56CF] px-3 text-[13px] font-semibold text-white transition-all hover:bg-[#7C69E3] disabled:opacity-40 disabled:cursor-not-allowed sm:px-5"
          aria-label="Run search"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Search</span>
        </button>

        <div className="mr-4 hidden shrink-0 items-center gap-1 rounded-md bg-[rgba(255,255,255,0.04)] px-2.5 py-1.5 sm:flex">
          <Command className="h-3 w-3 text-[#71717A]" />
          <span className="text-[11px] font-medium text-[#71717A]">K</span>
        </div>
      </div>
    </motion.div>
  );
}
