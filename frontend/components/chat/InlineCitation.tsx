"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface Props {
  index: number;
  sourceTitle: string;
  sourceType: string;
  snippet: string;
  url?: string;
}

export function InlineCitation({ index, sourceTitle, sourceType, snippet, url }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="mx-0.5 inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-[#FF5C00]/20 text-[10px] font-bold text-[#FF5C00] transition-colors hover:bg-[#FF5C00]/30">
        {index}
      </span>

      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 overflow-hidden rounded-[12px] border-2 border-ink bg-surface p-3 shadow-xl shadow-black/30"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="rounded-full bg-[#FF5C00]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#FF5C00] capitalize">
              {sourceType}
            </span>
            {url && (
              (() => {
                if (url.startsWith("/source/")) return url;
                if (url.startsWith("/")) {
                  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`;
                }
                try {
                  const u = new URL(url);
                  if (u.protocol === "http:" || u.protocol === "https:") {
                    return url;
                  }
                } catch {
                  return null;
                }
                return null;
              })() && (
                <a
                  href={
                    (url.startsWith("http") || url.startsWith("/source/"))
                      ? url
                      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`
                  }
                  target={url.startsWith("http") ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-0.5 text-[9px] text-[#B96A00] hover:text-[#B96A00] transition-colors"
                >
                  Open <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )
            )}
          </div>
          <div className="mb-1 text-[11px] font-medium text-foreground">{sourceTitle}</div>
          <div className="text-[10px] leading-relaxed text-foreground-3 line-clamp-2">
            &ldquo;{snippet}&rdquo;
          </div>
        </motion.div>
      )}
    </span>
  );
}
