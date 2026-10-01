"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Search, Mic, Paperclip, Send, Command, Sparkles, Loader2 } from "lucide-react";

interface Props {
  query: string;
  setQuery: (q: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder?: string;
  compact?: boolean;
}

export function ChatInput({ query, setQuery, onSend, loading, placeholder, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && query.trim()) {
      e.preventDefault();
      onSend();
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="group relative flex items-center rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111318] transition-all duration-300 focus-within:border-[#6E56CF]/50 focus-within:shadow-[0_0_0_3px_rgba(110,86,207,0.12)]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Ask a follow-up..."}
            className="h-12 flex-1 bg-transparent pl-5 pr-4 text-[13px] text-[#F5F5F5] placeholder-[#52525B] outline-none"
          />
          <button
            onClick={() => query.trim() && onSend()}
            disabled={!query.trim() || loading}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#6E56CF] text-white transition-all hover:bg-[#7C69E3] disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative"
    >
      <div className="group relative flex items-center rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#111318] transition-all duration-300 focus-within:border-[#6E56CF]/50 focus-within:shadow-[0_0_0_4px_rgba(110,86,207,0.12),0_0_40px_rgba(110,86,207,0.06)]">
        <div className="flex h-[64px] items-center pl-5">
          <Search className="h-5 w-5 text-[#71717A] transition-colors group-focus-within:text-[#6E56CF]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask anything about your knowledge..."}
          size={1}
          className="h-[64px] min-w-0 flex-1 bg-transparent px-4 text-[15px] font-normal text-[#F5F5F5] placeholder-[#52525B] outline-none"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
          >
            <span className="text-[14px]">×</span>
          </button>
        )}

        <button
          className="mr-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5] sm:flex"
          title="Voice input"
          aria-label="Voice input"
        >
          <Mic className="h-4 w-4" />
        </button>

        <button
          className="mr-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5] sm:flex"
          title="Attach file"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <button
          onClick={() => query.trim() && onSend()}
          disabled={!query.trim() || loading}
          className="mr-2 flex h-11 shrink-0 items-center gap-2 rounded-[14px] bg-[#6E56CF] px-3 text-[13px] font-semibold text-white transition-all hover:bg-[#7C69E3] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#6E56CF]/20 sm:px-5"
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Send</span>
        </button>

        <div className="mr-4 hidden shrink-0 items-center gap-1 rounded-md bg-[rgba(255,255,255,0.04)] px-2.5 py-1.5 sm:flex">
          <Command className="h-3 w-3 text-[#71717A]" />
          <span className="text-[11px] font-medium text-[#71717A]">K</span>
        </div>
      </div>
    </motion.div>
  );
}
