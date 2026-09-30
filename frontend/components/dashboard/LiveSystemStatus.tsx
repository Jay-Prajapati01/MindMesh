"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Database,
  Brain,
  Activity,
  Server,
} from "lucide-react";
import { getDetailedHealth } from "@/lib/api";

interface StatusItem {
  label: string;
  value: string;
  icon: typeof Brain;
  color: string;
  status: "healthy" | "busy" | "offline";
}

export function LiveSystemStatus() {
  const { data: health, isError, isLoading } = useQuery({
    queryKey: ["health", "detailed"],
    queryFn: getDetailedHealth,
    refetchInterval: 30000,
    retry: 1,
  });

  const ok = (check: string) => health?.checks?.[check] === "ok";

  const statuses: StatusItem[] = [
    {
      label: "API",
      value: isLoading ? "Checking…" : health?.app ?? "Unknown",
      icon: Server,
      color: isError ? "#EF4444" : health ? "#22C55E" : "#F59E0B",
      status: isError ? "offline" : health ? "healthy" : "busy",
    },
    {
      label: "LLM",
      value: health?.llm_model ?? "Unknown",
      icon: Brain,
      color: "#6E56CF",
      status: ok("ollama") ? "healthy" : "offline",
    },
    {
      label: "Embeddings",
      value: health?.embedding_model ?? "Unknown",
      icon: Activity,
      color: "#22C55E",
      status: ok("ollama") ? "healthy" : "offline",
    },
    {
      label: "Vector DB",
      value: health?.collection ?? "Unknown",
      icon: Database,
      color: "#0EA5E9",
      status: ok("qdrant") ? "healthy" : "offline",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {statuses.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-[6px]"
                style={{ backgroundColor: `${item.color}15` }}
              >
                <Icon className="h-3 w-3" style={{ color: item.color }} />
              </div>
              <span
                className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold"
                style={{
                  backgroundColor:
                    item.status === "healthy"
                      ? "rgba(34,197,94,0.1)"
                      : item.status === "busy"
                      ? "rgba(245,158,11,0.1)"
                      : "rgba(239,68,68,0.1)",
                  color:
                    item.status === "healthy"
                      ? "#22C55E"
                      : item.status === "busy"
                      ? "#F59E0B"
                      : "#EF4444",
                }}
              >
                <span
                  className="h-1 w-1 rounded-full"
                  style={{
                    backgroundColor:
                      item.status === "healthy"
                        ? "#22C55E"
                        : item.status === "busy"
                        ? "#F59E0B"
                        : "#EF4444",
                  }}
                />
                {item.status}
              </span>
            </div>
            <div className="text-[10px] font-medium text-[#F5F5F5]">{item.label}</div>
            <div className="truncate text-[9px] text-[#71717A]">{item.value}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
