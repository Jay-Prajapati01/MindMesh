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
      return <Youtube className={`${sizeClass} text-brand`} />;
    case "instagram":
      return <Instagram className={`${sizeClass} text-brand`} />;
    case "pdf":
      return <FileText className={`${sizeClass} text-brand`} />;
    case "document":
      return <Files className={`${sizeClass} text-brand`} />;
    case "audio":
      return <Mic className={`${sizeClass} text-brand`} />;
    case "web":
      return <Globe className={`${sizeClass} text-brand`} />;
    default:
      return <FileText className={`${sizeClass} text-muted`} />;
  }
}

function getSourceColor(type: string) {
  switch (type) {
    case "youtube":
      return { bg: "#FF5C0015", border: "#FF5C0030", text: "#FF5C00" };
    case "instagram":
      return { bg: "#FF5C0015", border: "#FF5C0030", text: "#FF5C00" };
    case "pdf":
      return { bg: "#E14E0015", border: "#E14E0030", text: "#E14E00" };
    case "document":
      return { bg: "#E14E0015", border: "#E14E0030", text: "#E14E00" };
    case "audio":
      return { bg: "#E14E0015", border: "#E14E0030", text: "#E14E00" };
    case "web":
      return { bg: "#B96A0015", border: "#B96A0030", text: "#B96A00" };
    default:
      return { bg: "#6B5B4D15", border: "#6B5B4D30", text: "#6B5B4D" };
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
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted">
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
          className={`group flex w-full items-center justify-between rounded-[14px] border bg-surface px-4 py-3.5 text-[13px] transition-all duration-200 ${
            isOpen
              ? "border-[#FF5C00]/50 ring-2 ring-[#FF5C00]/20"
              : "border-border hover:border-border"
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
                <div className="line-clamp-1 font-medium text-foreground">
                  {selected.title || "Untitled"}
                </div>
                <div className="text-[10px] text-muted">
                  {getSourceLabel(selected.source_type)}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted">Select a source...</span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform duration-200 ${
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
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[16px] border-2 border-ink bg-surface shadow-2xl shadow-black/50 backdrop-blur-xl"
            >
              {/* Search Input */}
              <div className="border-b-2 border-ink p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search sources..."
                    className="w-full rounded-[10px] border-2 border-ink bg-background py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted outline-none transition-colors focus:border-[#FF5C00]/50"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#FF5C00]/30 scrollbar-track-transparent">
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
                            ? "bg-brand-soft"
                            : isSelected
                            ? "bg-surface"
                            : "hover:bg-surface"
                        }`}
                      >
                        {/* Source Icon */}
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border transition-all duration-150 ${
                            isHighlighted ? "border-[#FF5C00]/30" : "border-transparent"
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
                          <div className="mt-1 line-clamp-1 text-[13px] font-medium text-foreground">
                            {source.title || "Untitled"}
                          </div>
                          {source.key_topics && source.key_topics.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {source.key_topics.slice(0, 2).map((topic, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-muted"
                                >
                                  {topic}
                                  {i < Math.min(source.key_topics.length, 2) - 1 && " ·"}
                                </span>
                              ))}
                              {source.key_topics.length > 2 && (
                                <span className="text-[10px] text-muted">
                                  +{source.key_topics.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Selected Check */}
                        {isSelected && (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#FF5C00]">
                            <Check className="h-3.5 w-3.5 text-ink" />
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-8">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                      <Search className="h-5 w-5 text-muted" />
                    </div>
                    <p className="text-[12px] font-medium text-muted">No sources found</p>
                    <p className="text-[10px] text-muted">Try a different search term</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t-2 border-ink px-4 py-2.5">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>{filteredSources.length} sources</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-surface px-1.5 py-0.5 text-[9px]">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-surface px-1.5 py-0.5 text-[9px]">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded bg-surface px-1.5 py-0.5 text-[9px]">Esc</kbd>
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
  // listSources() returns a paginated object {items, total, page, ...} — NOT an array.
  const { data } = useQuery({
    queryKey: ["sources", "compare"],
    queryFn: () => listSources(undefined, 1, 100),
  });
  const sources = data?.items;
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
        className="mb-8 rounded-[24px] border-2 border-ink bg-gradient-to-br from-card via-card to-brand-soft p-8"
      >
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] bg-brand-soft shadow-brut">
            <GitCompare className="h-7 w-7 text-brand" />
          </div>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">
              Cross-Source Intelligence
            </h1>
            <p className="mt-2 text-[15px] text-foreground-3 leading-relaxed max-w-2xl">
              Compare two sources to discover similarities, differences, and
              contradictions across your knowledge base.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-medium text-brand">
                <Sparkles className="h-3 w-3" />
                AI Comparison
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                Similarities
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
                Differences
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium text-muted">
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
        className="mb-6 rounded-[20px] border-2 border-ink bg-card p-6"
      >
        <h3 className="mb-4 text-[13px] font-semibold text-foreground">
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
            className="flex items-center gap-2 brut-btn bg-brand px-6 py-3.5 text-[13px] font-bold text-ink transition-all hover:bg-brand-hover disabled:cursor-not-allowed"
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
            <p className="text-[12px] text-brand">
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
            className="mb-6 rounded-[20px] border border-danger/30 bg-danger/5 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-danger/10">
                <X className="h-4 w-4 text-danger" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-danger">
                  Comparison Failed
                </p>
                <p className="mt-1 text-[12px] text-muted">
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
            className="rounded-[20px] border-2 border-ink bg-card p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-soft">
                <GitCompare className="h-5 w-5 text-brand" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">
                  Comparison Results
                </h3>
                <p className="text-[11px] text-muted">
                  AI-powered analysis of similarities and differences
                </p>
              </div>
            </div>

            <div className="rounded-[14px] border-2 border-ink bg-surface p-5">
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground-3">
                {mutation.data.analysis}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#FF5C00]" />
                Source A: {selectedA?.title || selectedA?.source_id}
              </span>
              <span>•</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#FF5C00]" />
                Source B: {selectedB?.title || selectedB?.source_id}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
