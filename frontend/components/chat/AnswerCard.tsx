"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { ChatResponse, Stats } from "@/lib/api";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { AITimeline } from "./AITimeline";
import { SourceReferenceCard } from "./SourceReferenceCard";
import { InlineCitation } from "./InlineCitation";
import { KnowledgeConnections } from "./KnowledgeConnections";
import { SearchHit } from "@/lib/api";

interface Props {
  response: ChatResponse;
  stats?: Stats;
  searchHits?: SearchHit[];
  index: number;
}

function parseAnswerWithSections(answer: string) {
  const sections: { type: "heading" | "paragraph" | "list"; content: string; items?: string[] }[] = [];
  const lines = answer.split("\n");

  let currentParagraph = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParagraph) {
        sections.push({ type: "paragraph", content: currentParagraph });
        currentParagraph = "";
      }
      continue;
    }

    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      if (currentParagraph) {
        sections.push({ type: "paragraph", content: currentParagraph });
        currentParagraph = "";
      }
      sections.push({ type: "heading", content: trimmed.replace(/\*\*/g, "") });
    } else if (trimmed.match(/^[-•*]\s/)) {
      if (currentParagraph) {
        sections.push({ type: "paragraph", content: currentParagraph });
        currentParagraph = "";
      }
      if (!sections.length || sections[sections.length - 1].type !== "list") {
        sections.push({ type: "list", content: "", items: [] });
      }
      sections[sections.length - 1].items!.push(trimmed.replace(/^[-•*]\s/, ""));
    } else {
      currentParagraph += (currentParagraph ? " " : "") + trimmed;
    }
  }

  if (currentParagraph) {
    sections.push({ type: "paragraph", content: currentParagraph });
  }

  return sections;
}

function parseHighlights(answer: string) {
  const highlights: { icon: string; title: string; description: string }[] = [];
  const lines = answer.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[✓✔✅]\s*\*?\*?(.+?)\*?\*?:\s*(.+)/);
    if (match) {
      highlights.push({
        icon: "✓",
        title: match[1].replace(/\*\*/g, ""),
        description: match[2].replace(/\*\*/g, ""),
      });
    }
  }

  return highlights;
}

function renderWithCitations(text: string, citations: { source_id: string; source_type: string; title?: string; snippet: string; url?: string; thumbnail?: string }[]) {
  const parts: (string | { type: "citation"; index: number; citation: typeof citations[0] })[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= citations.length) {
      parts.push({ type: "citation", index: num, citation: citations[num - 1] });
    } else {
      parts.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function AnswerCard({ response, searchHits, index }: Props) {
  const sections = useMemo(() => parseAnswerWithSections(response.answer), [response.answer]);
  const highlights = useMemo(() => parseHighlights(response.answer), [response.answer]);

  // Only real backend metrics — never fall back to unrelated totals.
  const chunksSearched = response.chunks_searched;
  const sourcesSearched = response.sources_searched;
  const citationsCount = response.citations.length;
  const searchTimeMs = response.search_time_ms ?? 0;
  const hasMetrics = chunksSearched != null || sourcesSearched != null;

  const sourceHits: SearchHit[] = (() => {
    if (searchHits) return searchHits;
    const seen = new Set<string>();
    return response.citations
      .filter((c) => {
        if (seen.has(c.source_id)) return false;
        seen.add(c.source_id);
        return true;
      })
      .map((c) => ({
        score: 0,
        text: c.snippet,
        source_id: c.source_id,
        source_type: c.source_type,
        title: c.title,
        summary: c.snippet,
        url: c.url,
        thumbnail: c.thumbnail,
      }));
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="space-y-4"
    >
      {/* AI Timeline */}
      <AITimeline
        loading={false}
        chunksSearched={chunksSearched ?? 0}
        sourcesSearched={sourcesSearched ?? 0}
        searchTimeMs={searchTimeMs}
        completedSteps={5}
      />

      {/* Main Answer Card */}
      <div className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318]">
        {/* Answer Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#6E56CF]/15">
              <Sparkles className="h-4 w-4 text-[#6E56CF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#F5F5F5]">MindMesh Intelligence</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
              </div>
              <div className="text-[11px] text-[#71717A]">
                {hasMetrics
                  ? `Searched ${chunksSearched ?? "—"} chunks across ${sourcesSearched ?? "—"} sources`
                  : "Grounded answer with citations"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#71717A]">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {citationsCount} citation{citationsCount === 1 ? "" : "s"}
            </span>
            {searchTimeMs > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {searchTimeMs >= 1000
                  ? `${(searchTimeMs / 1000).toFixed(1)}s`
                  : `${searchTimeMs}ms`}
              </span>
            )}
          </div>
        </div>

        {/* Answer Body */}
        <div className="px-6 py-5">
          <div className="max-w-none space-y-4 text-[14px] leading-[1.8] text-[#D4D4D8]">
            {sections.map((section, i) => {
              if (section.type === "heading") {
                return (
                  <h3 key={i} className="pt-2 text-[15px] font-semibold text-[#F5F5F5]">
                    {section.content}
                  </h3>
                );
              }
              if (section.type === "list") {
                return (
                  <ul key={i} className="space-y-2 pl-1">
                    {section.items?.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#6E56CF]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i}>
                  {renderWithCitations(section.content, response.citations).map((part, pi) =>
                    typeof part === "string" ? part : (
                      <InlineCitation
                        key={pi}
                        index={part.index}
                        sourceTitle={part.citation.title || part.citation.source_id}
                        sourceType={part.citation.source_type}
                        snippet={part.citation.snippet}
                        url={part.citation.url}
                      />
                    )
                  )}
                </p>
              );
            })}
          </div>
        </div>

        {/* Key Highlights */}
        {highlights.length > 0 && (
          <div className="border-t border-[rgba(255,255,255,0.04)] px-6 py-5">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#6E56CF]">
              Key Highlights
            </h3>
            <div className="space-y-2.5">
              {highlights.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 rounded-[12px] bg-[rgba(255,255,255,0.02)] p-3"
                >
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#22C55E]/15">
                    <span className="text-[10px] text-[#22C55E]">✓</span>
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold text-[#F5F5F5]">{h.title}</span>
                    <span className="text-[12px] text-[#A1A1AA]">: {h.description}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Source References */}
        <div className="border-t border-[rgba(255,255,255,0.04)] px-6 py-5">
          <SourceReferenceCard sources={sourceHits} visibleCount={5} />
        </div>

        {/* Knowledge Connections */}
        <div className="border-t border-[rgba(255,255,255,0.04)] px-6 py-5">
          <KnowledgeConnections sources={sourceHits} />
        </div>
      </div>

      {/* Answer Grounding */}
      <ConfidenceMeter
        citationsCount={citationsCount}
        sourcesCount={sourcesSearched}
        chunksCount={chunksSearched}
      />
    </motion.div>
  );
}
