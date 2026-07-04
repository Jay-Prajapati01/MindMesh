"use client";

import { useActiveProcesses } from "@/hooks/useSSE";
import { processManager } from "@/lib/processManager";
import { FileText, Video, Music, Globe, Camera, File, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string; href: string }> = {
  pdf: { icon: FileText, color: "#DC2626", label: "PDF", href: "/pdf" },
  youtube: { icon: Video, color: "#EF4444", label: "YouTube", href: "/youtube" },
  instagram: { icon: Camera, color: "#E1306C", label: "Instagram", href: "/instagram" },
  documents: { icon: File, color: "#3B82F6", label: "Document", href: "/documents" },
  audio: { icon: Music, color: "#8B5CF6", label: "Audio", href: "/audio" },
  web: { icon: Globe, color: "#22C55E", label: "Web", href: "/web" },
  file: { icon: File, color: "#71717A", label: "File", href: "/documents" },
  unknown: { icon: File, color: "#71717A", label: "Process", href: "/" },
};

function getProgress(events: Array<{ event: string; data: Record<string, any> }>): number {
  let total = 0, done = 0;
  for (const evt of events) {
    if (evt.event === "step_start") total++;
    if (evt.event === "step_complete") done++;
    if (evt.event === "step_progress" && evt.data.progress) {
      done += evt.data.progress / 100;
    }
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function ActiveProcessesBanner() {
  const processes = useActiveProcesses();

  if (processes.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-[600px] w-full px-4">
      <AnimatePresence>
        {processes.map((proc) => {
          const config = TYPE_CONFIG[proc.type] || TYPE_CONFIG.unknown;
          const Icon = config.icon;
          const progress = getProgress(proc.events);
          const currentStep = proc.events.filter(e => e.event === "step_start").pop();
          const stepName = currentStep?.data?.name || "";

          return (
            <motion.div
              key={proc.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111318]/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${config.color}15` }}>
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#F5F5F5] truncate">
                      {proc.fileName || proc.url || `${config.label} Processing`}
                    </span>
                    {proc.status === "running" && (
                      <Loader2 className="h-3 w-3 text-[#6E56CF] animate-spin flex-shrink-0" />
                    )}
                    {proc.status === "completed" && (
                      <CheckCircle className="h-3 w-3 text-[#22C55E] flex-shrink-0" />
                    )}
                    {proc.status === "failed" && (
                      <AlertCircle className="h-3 w-3 text-[#EF4444] flex-shrink-0" />
                    )}
                  </div>
                  {proc.status === "running" && stepName && (
                    <p className="text-[10px] text-[#71717A] truncate">{stepName}</p>
                  )}
                  {proc.status === "failed" && (
                    <p className="text-[10px] text-[#EF4444] truncate">{proc.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {proc.status === "running" && (
                    <span className="text-[11px] font-medium tabular-nums text-[#6E56CF]">{progress}%</span>
                  )}
                  <Link
                    href={config.href}
                    className="text-[10px] text-[#71717A] hover:text-[#F5F5F5] transition-colors px-2 py-1 rounded-md hover:bg-white/5"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => processManager.removeProcess(proc.id)}
                    className="p-1 rounded-md hover:bg-white/5 text-[#52525B] hover:text-[#F5F5F5] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {proc.status === "running" && (
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: config.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
