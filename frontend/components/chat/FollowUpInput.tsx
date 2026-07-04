"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  StickyNote,
  BookOpen,
  FileDown,
  GitCompare,
  Search,
  Languages,
  Sparkles,
} from "lucide-react";
import { ChatInput } from "./ChatInput";

const SUGGESTED_CHIPS = [
  { icon: Search, label: "Explain more", query: "Can you explain this in more detail?" },
  { icon: StickyNote, label: "Create Notes", query: "Create study notes from this answer" },
  { icon: BookOpen, label: "Generate Flashcards", query: "Generate flashcards from this content" },
  { icon: FileDown, label: "Export Markdown", query: "Export this as a markdown document" },
  { icon: GitCompare, label: "Compare Sources", query: "Compare the different sources on this topic" },
  { icon: Languages, label: "Simplify", query: "Explain this in simple terms" },
];

interface Props {
  onSend: (query: string) => void;
  loading: boolean;
}

export function FollowUpInput({ onSend, loading }: Props) {
  const [query, setQuery] = useState("");

  const handleSend = () => {
    if (query.trim()) {
      onSend(query);
      setQuery("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          Ask More
        </div>
        <ChatInput
          query={query}
          setQuery={setQuery}
          onSend={handleSend}
          loading={loading}
          placeholder="Ask anything about your knowledge..."
          compact
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_CHIPS.map((chip, i) => (
          <motion.button
            key={chip.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.04 }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSend(chip.query)}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] text-[#A1A1AA] transition-all hover:border-[#6E56CF]/30 hover:bg-[#6E56CF]/10 hover:text-[#6E56CF]"
          >
            <chip.icon className="h-3 w-3" />
            {chip.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
