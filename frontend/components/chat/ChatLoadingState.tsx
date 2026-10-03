"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function ChatLoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-ink bg-[#FF5C00]/15">
        <Sparkles className="h-4 w-4 text-[#FF5C00]" />
      </div>
      <div className="flex items-center gap-2.5 rounded-[16px] rounded-tl-[4px] border-2 border-ink bg-card px-5 py-4">
        <span className="text-[13px] text-muted">Thinking</span>
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="h-1.5 w-1.5 rounded-full bg-[#FF5C00]"
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
