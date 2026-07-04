"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { compareSources, listSources, SourceItem } from "@/lib/api";
import {
  Loader2,
  GitCompare,
  Youtube,
  Instagram,
  FileText,
  Files,
  Mic,
  Globe,
  ChevronDown,
  Search,
  Check,
  X,
  Sparkles,
} from "lucide-react";

function getSourceIcon(type: string, size: "sm" | "md" = "md") {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  switch (type) {
    case "youtube":
      return <Youtube className={`${sizeClass} text-[#FF0000]`} />;
    case "instagram":
      return <Instagram className={`${sizeClass} text-[#E1306C]`} />;
    case "pdf":
      return <FileText className={`${sizeClass} text-[#DC2626]`} />;
    case "document":
      return <Files className={`${sizeClass} text-[#7C3AED]`} />;
    case "audio":
      return <Mic className={`${sizeClass} text-[#059669]`} />;
    case "web":
      return <Globe className={`${sizeClass} text-[#0EA5E9]`} />;
    default:
      return <FileText className={`${sizeClass} text-[#71717A]`} />;
  }
}

function getSourceColor(type: string) {
  switch (type) {
    case "youtube":
      return { bg: "#FF000015", border: "#FF000030", text: "#FF0000" };
    case "instagram":
      return { bg: "#E1306C15", border: "#E1306C30", text: "#E1306C" };
    case "pdf":
      return { bg: "#DC262615", border: "#DC262630", text: "#DC2626" };
    case "document":
      return { bg: "#7C3AED15", border: "#7C3AED30", text: "#7C3AED" };
    case "audio":
      return { bg: "#05966915", border: "#05966930", text: "#059669" };
    case "web":
      return { bg: "#0EA5E915", border: "#0EA5E930", text: "#0EA5E9" };
    default:
      return { bg: "#71717A15", border: "#71717A30", text: "#71717A" };
  }
}

function getSourceLabel(type: string) {
  switch (type) {
    case "youtube": return "YouTube";
    case "instagram": return "Instagram";
    case "pdf": return "PDF";
    case "document": return "Document";
    case "audio": return "Audio";
    case "web": return "Web";
    default: return type;
  }
}

interface SourcePickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sources?: SourceItem[];
  excludeId?: string;
}

function SourcePicker({ label, value, onChange, sources, excludeId }: SourcePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = sources?.find((s) => s.source_id === value);

  const filteredSources = useMemo(() => {
    if (!sources) return [];
    return sources
      .filter((s) => s.source_id !== excludeId)
      .filter((s) => {
        if (!search) return true;
        const query = search.toLowerCase();
        return (
          (s.title?.toLowerCase().includes(query)) ||
          (s.source_type.toLowerCase().includes(query)) ||
          (s.channel?.toLowerCase().includes(query)) ||
          (s.key_topics?.some((t) => t.toLowerCase().includes(query)))
        );
      });
  }, [sources, search, excludeId]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredSources.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredSources[highlightedIndex]) {
          onChange(filteredSources[highlightedIndex].source_id);
          setIsOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
        {label}
      </label>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch("");
          }}
          className={`group flex w-full items-center justify-between rounded-[14px] border bg-[#171A22] px-4 py-3.5 text-[13px] transition-all duration-200 ${
            isOpen
              ? "border-[#6E56CF]/50 ring-2 ring-[#6E56CF]/20"
              : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.12)]"
          }`}
        >
          {selected ? (
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: getSourceColor(selected.source_type).bg }}
              >
                {getSourceIcon(selected.source_type)}
              </div>
              <div className="text-left">
                <div className="line-clamp-1 font-medium text-[#F5F5F5]">
                  {selected.title || "Untitled"}
                </div>
                <div className="text-[10px] text-[#71717A]">
                  {getSourceLabel(selected.source_type)}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-[#52525B]">Select a source...</span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-[#71717A] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.1)] bg-[#171A22] shadow-2xl shadow-black/50 backdrop-blur-xl"
            >
              {/* Search Input */}
              <div className="border-b border-[rgba(255,255,255,0.06)] p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search sources..."
                    className="w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#09090B] py-2.5 pl-10 pr-4 text-[13px] text-[#F5F5F5] placeholder-[#52525B] outline-none transition-colors focus:border-[#6E56CF]/50"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-[#F5F5F5]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#6E56CF]/30 scrollbar-track-transparent">
                {filteredSources.length > 0 ? (
                  filteredSources.map((source, index) => {
                    const colors = getSourceColor(source.source_type);
                    const isHighlighted = index === highlightedIndex;
                    const isSelected = source.source_id === value;

                    return (
                      <button
                        key={source.source_id}
                        onClick={() => {
                          onChange(source.source_id);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left transition-all duration-150 ${
                          isHighlighted
                            ? "bg-[#6E56CF]/10"
                            : isSelected
                            ? "bg-[rgba(255,255,255,0.03)]"
                            : "hover:bg-[rgba(255,255,255,0.03)]"
                        }`}
                      >
                        {/* Source Icon */}
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border transition-all duration-150 ${
                            isHighlighted ? "border-[#6E56CF]/30" : "border-transparent"
                          }`}
                          style={{ backgroundColor: colors.bg }}
                        >
                          {getSourceIcon(source.source_type)}
                        </div>

                        {/* Source Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider`}
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                              }}
                            >
                              {getSourceLabel(source.source_type)}
                            </span>
                          </div>
                          <div className="mt-1 line-clamp-1 text-[13px] font-medium text-[#F5F5F5]">
                            {source.title || "Untitled"}
                          </div>
                          {source.key_topics && source.key_topics.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {source.key_topics.slice(0, 2).map((topic, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-[#71717A]"
                                >
                                  {topic}
                                  {i < Math.min(source.key_topics.length, 2) - 1 && " ·"}
                                </span>
                              ))}
                              {source.key_topics.length > 2 && (
                                <span className="text-[10px] text-[#52525B]">
                                  +{source.key_topics.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Selected Check */}
                        {isSelected && (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#6E56CF]">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-8">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.05)]">
                      <Search className="h-5 w-5 text-[#71717A]" />
                    </div>
                    <p className="text-[12px] font-medium text-[#71717A]">No sources found</p>
                    <p className="text-[10px] text-[#52525B]">Try a different search term</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-2.5">
                <div className="flex items-center justify-between text-[10px] text-[#52525B]">
                  <span>{filteredSources.length} sources</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 text-[9px]">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 text-[9px]">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 text-[9px]">Esc</kbd>
                      Close
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const { data: sources } = useQuery({
    queryKey: ["sources", ""],
    queryFn: () => listSources(),
  });
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const mutation = useMutation({
    mutationFn: () => compareSources(a, b),
  });

  const selectedA = sources?.find((s) => s.source_id === a);
  const selectedB = sources?.find((s) => s.source_id === b);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#111318] via-[#111318] to-[#6E56CF]/5 p-8"
      >
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-[#6E56CF]/10 shadow-lg shadow-[#6E56CF]/5">
            <GitCompare className="h-7 w-7 text-[#6E56CF]" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-[#F5F5F5] tracking-tight">
              Cross-Source Intelligence
            </h1>
            <p className="mt-2 text-[15px] text-[#A1A1AA] leading-relaxed max-w-2xl">
              Compare two sources to discover similarities, differences, and
              contradictions across your knowledge base.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6E56CF]/10 px-3 py-1.5 text-[11px] font-medium text-[#6E56CF]">
                <Sparkles className="h-3 w-3" />
                AI Comparison
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Similarities
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Differences
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-[11px] font-medium text-[#71717A]">
                Contradictions
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Source Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6 rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-6"
      >
        <h3 className="mb-4 text-[13px] font-semibold text-[#F5F5F5]">
          Select Sources to Compare
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SourcePicker
            label="Source A"
            value={a}
            onChange={setA}
            sources={sources}
            excludeId={b}
          />
          <SourcePicker
            label="Source B"
            value={b}
            onChange={setB}
            sources={sources}
            excludeId={a}
          />
        </div>

        {/* Compare Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={() => a && b && mutation.mutate()}
            disabled={mutation.isPending || !a || !b || a === b}
            className="flex items-center gap-2 rounded-[14px] bg-gradient-to-r from-[#6E56CF] to-[#7C69E3] px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:from-[#7C69E3] hover:to-[#8B7CF6] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#6E56CF]/20 hover:shadow-[#6E56CF]/30"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <GitCompare className="h-4 w-4" />
                Compare Sources
              </>
            )}
          </button>

          {a === b && a !== "" && (
            <p className="text-[12px] text-[#F59E0B]">
              Please select two different sources to compare.
            </p>
          )}
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {mutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 rounded-[20px] border border-[#EF4444]/20 bg-[#EF4444]/[0.05] p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EF4444]/10">
                <X className="h-4 w-4 text-[#EF4444]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#EF4444]">
                  Comparison Failed
                </p>
                <p className="mt-1 text-[12px] text-[#EF4444]/70">
                  Unable to compare the selected sources. Please try again.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {mutation.data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#22C55E]/10">
                <GitCompare className="h-5 w-5 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#F5F5F5]">
                  Comparison Results
                </h3>
                <p className="text-[11px] text-[#71717A]">
                  AI-powered analysis of similarities and differences
                </p>
              </div>
            </div>

            <div className="rounded-[14px] border border-[rgba(255,255,255,0.04)] bg-[#171A22] p-5">
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#A1A1AA]">
                {mutation.data.analysis}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[#71717A]">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#6E56CF]" />
                Source A: {selectedA?.title || selectedA?.source_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                Source B: {selectedB?.title || selectedB?.source_id}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
