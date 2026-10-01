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
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Layers,
  Hash,
  File,
} from "lucide-react";
import { SearchHit } from "@/lib/api";
import { ThumbImage } from "@/components/ThumbImage";

function getSourceIcon(type: string) {
  switch (type) {
    case "youtube": return <Youtube className="h-4 w-4" />;
    case "instagram": return <Instagram className="h-4 w-4" />;
    case "pdf": return <FileText className="h-4 w-4" />;
    case "document": return <Files className="h-4 w-4" />;
    case "audio": return <Mic className="h-4 w-4" />;
    case "web": return <Globe className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
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

function getScoreColor(score: number) {
  if (score >= 0.55) return "#22C55E";
  if (score >= 0.4) return "#F59E0B";
  return "#EF4444";
}

function getScoreLabel(score: number) {
  if (score >= 0.55) return "High Match";
  if (score >= 0.4) return "Medium Match";
  return "Low Match";
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(date?: string) {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

interface Props {
  hit: SearchHit;
  index: number;
}

export function SearchResultCard({ hit, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = getScoreColor(hit.score);
  const sourceColor = getSourceColor(hit.source_type);
  const summary = hit.summary || hit.text.slice(0, 200) + (hit.text.length > 200 ? "..." : "");
  const entities = hit.entities || [];
  const tags = hit.tags || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[#111318] transition-all duration-300 hover:border-[rgba(255,255,255,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
    >
      <div className="flex flex-wrap gap-4 p-5">
        <div className="flex flex-col items-center gap-2 pt-1">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[14px] text-[22px] font-bold tabular-nums"
            style={{
              backgroundColor: `${scoreColor}15`,
              color: scoreColor,
            }}
          >
            {hit.score.toFixed(2)}
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
            style={{
              backgroundColor: `${scoreColor}15`,
              color: scoreColor,
            }}
          >
            {getScoreLabel(hit.score)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ backgroundColor: `${sourceColor}20`, color: sourceColor }}
            >
              {getSourceIcon(hit.source_type)}
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
              style={{ backgroundColor: `${sourceColor}15`, color: sourceColor }}
            >
              {hit.source_type}
            </span>
            {hit.author && (
              <span className="flex items-center gap-1 text-[11px] text-[#71717A]">
                <User className="h-3 w-3" />
                {hit.author}
              </span>
            )}
            {hit.created_at && (
              <span className="flex items-center gap-1 text-[11px] text-[#71717A]">
                <Clock className="h-3 w-3" />
                {timeAgo(hit.created_at)}
              </span>
            )}
          </div>

          <h3 className="mb-1.5 text-[14px] font-semibold leading-snug text-[#F5F5F5]">
            {hit.title || hit.source_id}
          </h3>

          <p className="mb-3 text-[12px] leading-relaxed text-[#A1A1AA]">
            {summary}
          </p>

          <div className="mb-3 rounded-lg bg-[rgba(255,255,255,0.02)] px-3 py-2 border-l-2 border-[#6E56CF]/30">
            <p className="text-[11px] leading-relaxed text-[#A1A1AA] line-clamp-2">
              &ldquo;{hit.text.slice(0, 180)}{hit.text.length > 180 ? "..." : ""}&rdquo;
            </p>
          </div>

          {(tags.length > 0 || entities.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#6E56CF]/10 px-2.5 py-1 text-[10px] font-medium text-[#6E56CF]"
                >
                  {tag}
                </span>
              ))}
              {entities.slice(0, 3).map((entity) => (
                <span
                  key={entity}
                  className="flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] text-[#A1A1AA]"
                >
                  <Hash className="h-2.5 w-2.5" />
                  {entity}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-[10px] text-[#52525B]">
            {hit.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(hit.duration)}
              </span>
            )}
            {hit.chunks && (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {hit.chunks} chunks
              </span>
            )}
          </div>
        </div>

        {hit.thumbnail && (
          <div className="relative hidden h-24 w-40 flex-shrink-0 overflow-hidden rounded-[12px] sm:block">
            <ThumbImage
              src={hit.thumbnail}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              fallbackClassName="h-24 w-40"
            />
            {hit.duration && (
              <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {formatDuration(hit.duration)}
              </div>
            )}
          </div>
        )}

        {!hit.thumbnail && hit.source_type === "youtube" && (
          <div className="hidden h-24 w-40 flex-shrink-0 items-center justify-center rounded-[12px] bg-[rgba(255,255,255,0.03)] sm:flex">
            <Youtube className="h-8 w-8 text-[#EF4444]/30" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.04)] px-5 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-[#71717A] transition-colors hover:text-[#F5F5F5]"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {expanded ? "Less" : "More"}
        </button>
        <div className="flex-1" />
        {(() => {
          const urlStr = hit.url || "";
          // Only http(s) links and absolute paths ("/api/...") are valid.
          // Anything else (e.g. a channel name) would produce a garbage URL.
          const sourceUrl = urlStr.startsWith("http")
            ? urlStr
            : urlStr.startsWith("/")
            ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${urlStr}`
            : null;
          return sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.08)] hover:text-[#F5F5F5]"
            >
              <ExternalLink className="h-3 w-3" />
              Open source
            </a>
          ) : (
            <button className="flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] text-[#52525B] cursor-not-allowed">
              <ExternalLink className="h-3 w-3" />
              No link
            </button>
          );
        })()}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[rgba(255,255,255,0.04)]"
          >
            <div className="space-y-3 p-5 pt-4">
              <div>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  Full Transcript
                </h4>
                <p className="text-[12px] leading-relaxed text-[#A1A1AA]">
                  {hit.text}
                </p>
              </div>
              {entities.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                    Extracted Entities
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {entities.map((entity) => (
                      <span
                        key={entity}
                        className="rounded-full bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] text-[#A1A1AA]"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
