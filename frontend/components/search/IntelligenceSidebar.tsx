"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Brain,
  MessageSquare,
  ArrowRight,
  Layers,
  Database,
  Target,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { SearchHit, Stats } from "@/lib/api";
import { AnimatedCounter } from "./AnimatedCounter";

const PIE_COLORS = ["#EF4444", "#E1306C", "#DC2626", "#7C3AED", "#059669", "#0EA5E9"];

interface Props {
  hits: SearchHit[];
  stats?: Stats;
  query?: string;
  chunksSearched?: number;
  searchTimeMs?: number;
  loading: boolean;
}

export function IntelligenceSidebar({ hits, stats, query = "", chunksSearched = 0, searchTimeMs, loading }: Props) {
  const router = useRouter();
  const [showAllTopics, setShowAllTopics] = useState(false);
  const totalChunks = stats?.indexed_chunks ?? 0;
  const totalSources = stats?.total_sources ?? 0;

  const avgRelevance = useMemo(() => {
    if (hits.length === 0) return 0;
    return hits.reduce((a, h) => a + h.score, 0) / hits.length;
  }, [hits]);

  const scoreRange = useMemo(() => {
    if (hits.length === 0) return null;
    const scores = hits.map((h) => h.score);
    return { min: Math.min(...scores), max: Math.max(...scores) };
  }, [hits]);

  const sourceDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    hits.forEach((h) => {
      counts[h.source_type] = (counts[h.source_type] || 0) + 1;
    });
    const total = hits.length || 1;
    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
        percentage: Math.round((count / total) * 100),
        color:
          type === "youtube" ? PIE_COLORS[0] :
          type === "instagram" ? PIE_COLORS[1] :
          type === "pdf" ? PIE_COLORS[2] :
          type === "document" ? PIE_COLORS[3] :
          type === "audio" ? PIE_COLORS[4] :
          type === "web" ? PIE_COLORS[5] :
          "#71717A",
      }))
      .sort((a, b) => b.value - a.value);
  }, [hits]);

  const relatedTopics = useMemo(() => {
    const allTags = hits.flatMap((h) => h.tags || []);
    const allEntities = hits.flatMap((h) => h.entities || []);
    const combined = [...allTags, ...allEntities];
    const freq: Record<string, number> = {};
    combined.forEach((t) => { freq[t] = (freq[t] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, showAllTopics ? 60 : 10)
      .map(([tag]) => tag);
  }, [hits, showAllTopics]);

  const relatedMemories = useMemo(() => {
    const seen = new Set<string>();
    return hits
      .filter((h) => {
        if (seen.has(h.source_id)) return false;
        seen.add(h.source_id);
        return true;
      })
      .slice(0, 4)
      .map((h) => ({
        title: h.title || h.source_id,
        type: h.source_type,
        score: h.score,
      }));
  }, [hits]);

  const hasResults = hits.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="space-y-4"
    >
      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Indexed Chunks", value: totalChunks, icon: Layers, color: "#6E56CF", suffix: "" },
          { label: "Sources", value: totalSources, icon: Database, color: "#22C55E", suffix: "" },
          { label: "Results", value: hits.length, icon: Target, color: "#F59E0B", suffix: "" },
          { label: "Avg Score", value: Math.round(avgRelevance * 100), icon: TrendingUp, color: "#0EA5E9", suffix: "%" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="h-3 w-3" style={{ color: stat.color }} />
              </div>
              <span className="text-[10px] text-[#71717A]">{stat.label}</span>
            </div>
            <div className="text-[18px] font-bold text-[#F5F5F5]">
              {loading ? (
                <div className="h-5 w-12 animate-pulse rounded bg-[rgba(255,255,255,0.05)]" />
              ) : (
                <AnimatedCounter value={stat.value} />
              )}
              {stat.suffix && !loading && (
                <span className="text-[12px] text-[#71717A]">{stat.suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Result Scores */}
      <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#F5F5F5]">
            Result Scores
          </span>
          <span className="text-[13px] font-bold text-[#6E56CF]">
            {scoreRange ? scoreRange.max.toFixed(2) : "—"}
          </span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#6E56CF] to-[#7C69E3]"
            style={{ width: `${Math.max(0, Math.min(100, Math.round(avgRelevance * 100)))}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-[#71717A]">
          {scoreRange
            ? `Cosine similarity ${scoreRange.min.toFixed(2)}–${scoreRange.max.toFixed(2)} · avg ${avgRelevance.toFixed(2)}`
            : "Run a search to see similarity scores"}
        </p>
      </div>

      {/* Source Distribution */}
      {hasResults && (
        <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
            Sources Distribution
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {sourceDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171A22",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "#F5F5F5" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[16px] font-bold text-[#F5F5F5]">
                  {hits.length}
                </span>
                <span className="text-[9px] text-[#71717A]">Results</span>
              </div>
            </div>
            <div className="space-y-2">
              {sourceDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] text-[#A1A1AA]">{item.name}</span>
                  <span className="ml-auto text-[10px] font-medium text-[#F5F5F5]">
                    {item.value}
                  </span>
                  <span className="text-[9px] text-[#52525B]">
                    ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Insights */}
      <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          Search Insights
        </h3>
        <div className="space-y-2.5">
          {[
            { icon: TrendingUp, label: "Average relevance score", value: avgRelevance.toFixed(2), color: "#6E56CF" },
            ...(searchTimeMs
              ? [{ icon: Clock, label: "Search completed in", value: `${searchTimeMs}ms`, color: "#22C55E" }]
              : []),
            ...(chunksSearched
              ? [{ icon: Layers, label: `Searched ${chunksSearched} chunks`, value: "", color: "#0EA5E9" }]
              : []),
            { icon: Target, label: `${hits.length} results matched`, value: "", color: "#EF4444" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-md"
                style={{ backgroundColor: `${item.color}10` }}
              >
                <item.icon className="h-3 w-3" style={{ color: item.color }} />
              </div>
              <span className="flex-1 text-[11px] text-[#A1A1AA]">{item.label}</span>
              {item.value && (
                <span className="text-[11px] font-semibold text-[#F5F5F5]">
                  {item.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
            Related Topics
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {relatedTopics.map((topic) => (
              <motion.span
                key={topic}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="cursor-pointer rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] text-[#A1A1AA] transition-all hover:border-[#6E56CF]/30 hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
              >
                {topic}
              </motion.span>
            ))}
          </div>
          <button
            onClick={() => setShowAllTopics((v) => !v)}
            className="mt-2.5 flex items-center gap-1 text-[10px] text-[#6E56CF] hover:text-[#7C69E3] transition-colors"
          >
            {showAllTopics ? "Show fewer topics" : "View all topics"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Related Memories */}
      {relatedMemories.length > 0 && (
        <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
            Related Memories
          </h3>
          <div className="space-y-2">
            {relatedMemories.map((memory) => (
              <div
                key={memory.title}
                className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgba(255,255,255,0.04)]">
                  <Brain className="h-3 w-3 text-[#71717A]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-medium text-[#F5F5F5]">
                    {memory.title}
                  </div>
                  <div className="text-[9px] text-[#52525B] capitalize">
                    {memory.type}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#6E56CF]">
                  {memory.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ask AI Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => router.push(`/chat?q=${encodeURIComponent(query)}`)}
        className="flex w-full items-center justify-center gap-3 rounded-[16px] bg-gradient-to-r from-[#6E56CF] to-[#7C69E3] px-5 py-4 text-[13px] font-semibold text-white shadow-lg shadow-[#6E56CF]/20 transition-all hover:shadow-xl hover:shadow-[#6E56CF]/30"
      >
        <MessageSquare className="h-4 w-4" />
        Ask AI about these results
        <ArrowRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
