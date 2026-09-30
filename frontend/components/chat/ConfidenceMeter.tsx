"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";

interface Props {
  citationsCount: number;
  sourcesCount?: number;
  chunksCount?: number;
}

export function ConfidenceMeter({ citationsCount, sourcesCount, chunksCount }: Props) {
  const hasCitations = citationsCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield
            className="h-4 w-4"
            style={{ color: hasCitations ? "#22C55E" : "#F59E0B" }}
          />
          <span className="text-[13px] font-semibold text-[#F5F5F5]">
            Answer Grounding
          </span>
        </div>
        <span
          className="text-[20px] font-bold tabular-nums"
          style={{ color: hasCitations ? "#22C55E" : "#F59E0B" }}
        >
          {citationsCount}
        </span>
      </div>

      <p className="mb-3 text-[11px] text-[#71717A]">
        {hasCitations
          ? `This answer cites ${citationsCount} passage${citationsCount === 1 ? "" : "s"} from your knowledge base.`
          : "No citations were attached — treat this answer as ungrounded and verify against your sources."}
      </p>

      <div className="space-y-2 border-t border-[rgba(255,255,255,0.04)] pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
          Grounded by
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Citations", value: citationsCount },
            { label: "Sources", value: sourcesCount },
            { label: "Chunks", value: chunksCount },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#22C55E]">✓</span>
              <span className="text-[11px] font-semibold text-[#F5F5F5]">
                {item.value != null ? item.value : "—"}
              </span>
              <span className="text-[10px] text-[#71717A]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
