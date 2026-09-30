"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Instagram,
  FileText,
  Files,
  Mic,
  Globe,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SearchHit } from "@/lib/api";

function getSourceIcon(type: string) {
  switch (type) {
    case "youtube": return <Youtube className="h-4 w-4" />;
    case "instagram": return <Instagram className="h-4 w-4" />;
    case "pdf": return <FileText className="h-4 w-4" />;
    case "document": return <Files className="h-4 w-4" />;
    case "audio": return <Mic className="h-4 w-4" />;
    case "web": return <Globe className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

function getSourceColor(type: string) {
  switch (type) {
    case "youtube": return "#EF4444";
    case "instagram": return "#E1306C";
    case "pdf": return "#DC2626";
    case "document": return "#7C3AED";
    case "audio": return "#059669";
    case "web": return "#0EA5E9";
    default: return "#71717A";
  }
}

function getSourceUrl(source: SearchHit): string | null {
  if (source.url) {
    if (source.url.startsWith("http")) return source.url;
    // Absolute API paths like "/api/sources/x/download" are valid;
    // anything else (channel names etc.) must NOT become a URL.
    if (source.url.startsWith("/")) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      return `${API_URL}${source.url}`;
    }
  }
  return null;
}

function getActionLabel(type: string): string {
  switch (type) {
    case "youtube": return "Watch Video";
    case "instagram": return "View Post";
    case "pdf": return "Open PDF";
    case "document": return "Open Document";
    case "audio": return "Play Audio";
    case "web": return "Open Page";
    default: return "Open";
  }
}

interface Props {
  sources: SearchHit[];
  visibleCount?: number;
}

export function SourceReferenceCard({ sources, visibleCount = 5 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sources : sources.slice(0, visibleCount);
  const hasMore = sources.length > visibleCount;

  if (sources.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#71717A]">
          Sources
        </h3>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-[#6E56CF] hover:text-[#7C69E3] transition-colors"
          >
            {expanded ? "Show less" : `View all ${sources.length} sources`}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {visible.map((source, i) => {
            const color = getSourceColor(source.source_type);
            const url = getSourceUrl(source);
            return (
              <motion.div
                key={`${source.source_id}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2, scale: 1.01 }}
              >
                <a
                  href={url || "#"}
                  target={url?.startsWith("http") ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.04)]"
                >
                  <div className="flex gap-3">
                    {source.thumbnail ? (
                      <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-[10px]">
                        <img src={source.thumbnail} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[10px]"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <div style={{ color }}>{getSourceIcon(source.source_type)}</div>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {source.source_type}
                        </span>
                        {source.score > 0 && (
                          <span className="text-[10px] font-semibold text-[#22C55E]">
                            {(source.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] font-medium text-[#F5F5F5]">
                        {source.title || source.source_id}
                      </div>
                      {url && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            {getActionLabel(source.source_type)}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                          {source.source_type !== "youtube" && source.source_type !== "web" && source.source_type !== "instagram" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[9px] font-semibold text-[#A1A1AA] transition-colors hover:bg-[rgba(255,255,255,0.1)]">
                              <Download className="h-2.5 w-2.5" />
                              Download
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
