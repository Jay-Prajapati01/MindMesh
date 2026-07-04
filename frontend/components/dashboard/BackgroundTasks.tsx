"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  FileText,
  Instagram,
  Music,
  Globe,
  Files,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { processManager, ProcessState } from "@/lib/processManager";

const TYPE_CONFIG: Record<string, { icon: typeof Video; color: string; label: string }> = {
  youtube: { icon: Video, color: "#EF4444", label: "YouTube" },
  instagram: { icon: Instagram, color: "#E1306C", label: "Instagram" },
  pdf: { icon: FileText, color: "#DC2626", label: "PDF" },
  documents: { icon: Files, color: "#7C3AED", label: "Document" },
  audio: { icon: Music, color: "#059669", label: "Audio" },
  web: { icon: Globe, color: "#0EA5E9", label: "Web" },
  file: { icon: Files, color: "#71717A", label: "File" },
};

function getProgress(events: Array<{ event: string; data: Record<string, any> }>): number {
  let total = 0,
    done = 0;
  for (const evt of events) {
    if (evt.event === "step_start") total++;
    if (evt.event === "step_complete") done++;
    if (evt.event === "step_progress" && evt.data.progress) {
      done += evt.data.progress / 100;
    }
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function BackgroundTasks() {
  const [processes, setProcesses] = useState<ProcessState[]>([]);

  useEffect(() => {
    setProcesses(processManager.getActiveProcesses());
    let timeout: ReturnType<typeof setTimeout>;
    const debouncedUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setProcesses(processManager.getActiveProcesses()), 300);
    };
    const unsub = processManager.subscribeAll(debouncedUpdate);
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]">
          <CheckCircle className="h-5 w-5 text-[#22C55E]" />
        </div>
        <p className="text-[12px] font-medium text-[#F5F5F5]">All caught up</p>
        <p className="text-[10px] text-[#71717A]">No active background tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {processes.map((proc) => {
          const config = TYPE_CONFIG[proc.type] || TYPE_CONFIG.file;
          const Icon = config.icon;
          const progress = getProgress(proc.events);
          const currentStep = proc.events.filter((e) => e.event === "step_start").pop();
          const stepName = currentStep?.data?.name || "";

          return (
            <motion.div
              key={proc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-3"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#F5F5F5]">
                      {config.label} Processing
                    </span>
                    <Loader2 className="h-3 w-3 animate-spin text-[#6E56CF]" />
                  </div>
                  {stepName && (
                    <p className="text-[10px] text-[#71717A] truncate">{stepName}</p>
                  )}
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-[#6E56CF]">
                  {progress}%
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
