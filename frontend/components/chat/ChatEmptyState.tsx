"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Search,
  FileText,
  Mic,
  Globe,
} from "lucide-react";
import { getGraph, getStats } from "@/lib/api";

const SUGGESTED_QUESTIONS = [
  { icon: Brain, label: "What are the key insights from my notes?", color: "#FF5C00" },
  { icon: Sparkles, label: "Summarize everything I've saved today", color: "#FF5C00" },
  { icon: BookOpen, label: "What topics appear most in my knowledge base?", color: "#B96A00" },
  { icon: Zap, label: "Find connections between my YouTube videos and PDFs", color: "#F59E0B" },
  { icon: Lightbulb, label: "What are the most important concepts I've learned?", color: "#FF5C00" },
  { icon: HelpCircle, label: "Explain the main argument from my latest document", color: "#E14E00" },
];

const QUICK_ACTIONS = [
  { icon: FileText, label: "Upload PDF", color: "#E14E00", href: "/pdf" },
  { icon: Globe, label: "Save Web Page", color: "#B96A00", href: "/web" },
  { icon: Mic, label: "Upload Audio", color: "#E14E00", href: "/audio" },
  { icon: Search, label: "Semantic Search", color: "#FF5C00", href: "/search" },
];

interface Props {
  onQuestionClick: (q: string) => void;
}

export function ChatEmptyState({ onQuestionClick }: Props) {
  const { data: graph } = useQuery({
    queryKey: ["graph"],
    queryFn: getGraph,
    staleTime: 60_000,
    retry: 1,
  });
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 60_000,
    retry: 1,
  });

  const topEntities = (graph?.nodes ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const recentQuestions = (stats?.recent_questions ?? [])
    .filter((q) => q.text && q.text.trim())
    .slice(0, 6);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center py-8"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#FF5C00]/15 to-[#FF5C00]/5">
        <Brain className="h-10 w-10 text-[#FF5C00]" />
      </div>

      <h2 className="mb-2 text-[20px] font-bold text-foreground">
        Ask Your Intelligence
      </h2>
      <p className="mb-8 max-w-md text-center text-[13px] text-muted">
        Ask questions across your entire knowledge base. Get grounded answers
        with citations, source references, and connected insights.
      </p>

      {/* Suggested Questions */}
      <div className="mb-8 w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <Sparkles className="h-3.5 w-3.5 text-[#FF5C00]" />
          Suggested Questions
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <motion.button
              key={q.label}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onQuestionClick(q.label)}
              className="flex items-center gap-3 rounded-[14px] border-2 border-ink bg-card p-3.5 text-left transition-all hover:border-border hover:bg-surface"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `${q.color}15` }}
              >
                <q.icon className="h-4 w-4" style={{ color: q.color }} />
              </div>
              <span className="text-[12px] text-foreground-3">{q.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Questions */}
      {recentQuestions.length > 0 && (
        <div className="mb-8 w-full max-w-2xl">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            Your Recent Questions
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentQuestions.map((q) => (
              <button
                key={q.text + q.created_at}
                onClick={() => onQuestionClick(q.text)}
                className="rounded-full bg-surface px-3.5 py-1.5 text-[11px] text-muted transition-all hover:bg-[#FF5C00]/10 hover:text-[#FF5C00]"
              >
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Entities */}
      {topEntities.length > 0 && (
        <div className="mb-8 w-full max-w-2xl">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <Zap className="h-3.5 w-3.5" />
            Top Entities in Your Knowledge Graph
          </h3>
          <div className="flex flex-wrap gap-2">
            {topEntities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => onQuestionClick(`What do I know about ${entity.label}?`)}
                className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-3.5 py-1.5 text-[11px] text-foreground-3 transition-all hover:border-[#FF5C00]/30 hover:bg-[#FF5C00]/10 hover:text-[#FF5C00]"
              >
                <Zap className="h-3 w-3 text-[#F59E0B]" />
                {entity.label}
                <span className="text-[10px] text-muted">{entity.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <Clock className="h-3.5 w-3.5" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-2 rounded-[12px] border-2 border-ink bg-card p-3 transition-all hover:border-border hover:bg-surface"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <action.icon className="h-4 w-4" style={{ color: action.color }} />
              </div>
              <span className="text-[11px] font-medium text-foreground-3">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
