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
      <div className="rounded-[16px] border-2 border-ink bg-card p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
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
            className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-3 py-1.5 text-[11px] text-foreground-3 transition-all hover:border-[#FF5C00]/30 hover:bg-[#FF5C00]/10 hover:text-[#FF5C00]"
          >
            <chip.icon className="h-3 w-3" />
            {chip.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
