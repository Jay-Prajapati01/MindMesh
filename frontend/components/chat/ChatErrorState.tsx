"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Search, HelpCircle, ArrowRight } from "lucide-react";

interface Props {
  error: string;
  onRetry: () => void;
  onBroaden: () => void;
}

export function ChatErrorState({ error, onRetry, onBroaden }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-12"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#EF4444]/10">
        <AlertTriangle className="h-10 w-10 text-[#EF4444]" />
      </div>

      <h2 className="mb-2 text-[18px] font-bold text-[#F5F5F5]">
        Couldn&apos;t generate a grounded answer
      </h2>
      <p className="mb-6 max-w-md text-center text-[13px] text-[#71717A]">
        The AI couldn&apos;t find enough relevant information to generate a confident
        response. This usually means the question is too specific or your knowledge
        base doesn&apos;t have matching content yet.
      </p>

      <div className="mb-6 max-w-sm space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
          Suggestions
        </h3>
        {[
          { icon: Search, label: "Broaden your search terms", action: onBroaden },
          { icon: HelpCircle, label: "Try asking differently", action: onRetry },
          { icon: ArrowRight, label: "Add more content to your knowledge base", action: () => {} },
        ].map((s, i) => (
          <button
            key={i}
            onClick={s.action}
            className="flex w-full items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 text-left text-[12px] text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
          >
            <s.icon className="h-3.5 w-3.5 text-[#52525B]" />
            {s.label}
          </button>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onRetry}
        className="flex items-center gap-2 rounded-[14px] bg-[#6E56CF] px-5 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#7C69E3]"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </motion.button>
    </motion.div>
  );
}
