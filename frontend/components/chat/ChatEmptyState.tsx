"use client";

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

const SUGGESTED_QUESTIONS = [
  { icon: Brain, label: "What are the key insights from my notes?", color: "#6E56CF" },
  { icon: Sparkles, label: "Summarize everything I've saved today", color: "#22C55E" },
  { icon: BookOpen, label: "What topics appear most in my knowledge base?", color: "#0EA5E9" },
  { icon: Zap, label: "Find connections between my YouTube videos and PDFs", color: "#F59E0B" },
  { icon: Lightbulb, label: "What are the most important concepts I've learned?", color: "#E1306C" },
  { icon: HelpCircle, label: "Explain the main argument from my latest document", color: "#059669" },
];

const TRENDING_TOPICS = [
  "AI Agents",
  "Machine Learning",
  "Knowledge Graphs",
  "RAG Systems",
  "Prompt Engineering",
  "Vector Databases",
];

const RECENT_ENTITIES = [
  "NotebookLM",
  "OpenAI",
  "Cursor",
  "LangChain",
  "Ollama",
  "Qdrant",
];

const QUICK_ACTIONS = [
  { icon: FileText, label: "Upload PDF", color: "#DC2626", href: "/pdf" },
  { icon: Globe, label: "Save Web Page", color: "#0EA5E9", href: "/web" },
  { icon: Mic, label: "Upload Audio", color: "#059669", href: "/audio" },
  { icon: Search, label: "Semantic Search", color: "#6E56CF", href: "/search" },
];

interface Props {
  onQuestionClick: (q: string) => void;
}

export function ChatEmptyState({ onQuestionClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center py-8"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#6E56CF]/15 to-[#6E56CF]/5">
        <Brain className="h-10 w-10 text-[#6E56CF]" />
      </div>

      <h2 className="mb-2 text-[20px] font-bold text-[#F5F5F5]">
        Ask Your Intelligence
      </h2>
      <p className="mb-8 max-w-md text-center text-[13px] text-[#71717A]">
        Ask questions across your entire knowledge base. Get grounded answers
        with citations, source references, and connected insights.
      </p>

      {/* Suggested Questions */}
      <div className="mb-8 w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <Sparkles className="h-3.5 w-3.5 text-[#6E56CF]" />
          Suggested Questions
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <motion.button
              key={q.label}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onQuestionClick(q.label)}
              className="flex items-center gap-3 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3.5 text-left transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.03)]"
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: `${q.color}15` }}
              >
                <q.icon className="h-4 w-4" style={{ color: q.color }} />
              </div>
              <span className="text-[12px] text-[#A1A1AA]">{q.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="mb-8 w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <TrendingUp className="h-3.5 w-3.5" />
          Trending Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {TRENDING_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => onQuestionClick(`Tell me about ${topic}`)}
              className="rounded-full bg-[rgba(255,255,255,0.04)] px-3.5 py-1.5 text-[11px] text-[#71717A] transition-all hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Entities */}
      <div className="mb-8 w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <Zap className="h-3.5 w-3.5" />
          Recently Indexed Entities
        </h3>
        <div className="flex flex-wrap gap-2">
          {RECENT_ENTITIES.map((entity) => (
            <button
              key={entity}
              onClick={() => onQuestionClick(`What do I know about ${entity}?`)}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 text-[11px] text-[#A1A1AA] transition-all hover:border-[#6E56CF]/30 hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
            >
              <Zap className="h-3 w-3 text-[#F59E0B]" />
              {entity}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          <Clock className="h-3.5 w-3.5" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-3 transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.03)]"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <action.icon className="h-4 w-4" style={{ color: action.color }} />
              </div>
              <span className="text-[11px] font-medium text-[#A1A1AA]">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
