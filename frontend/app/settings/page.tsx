"use client";

import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/lib/api";
import { useAppStore } from "@/lib/store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SettingsPage() {
  const { settings, setSettings } = useAppStore();
  const { data } = useQuery({ queryKey: ["stats"], queryFn: getStats });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-gray-400">
        Backend configuration and retrieval preferences.
      </p>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Backend</h2>
          <Row label="API URL" value={API_URL} />
          <Row label="Vector store" value={data?.vector_store ?? "qdrant"} />
          <Row
            label="Indexed chunks"
            value={String(data?.indexed_chunks ?? 0)}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">
            Retrieval
          </h2>
          <label className="mb-2 block text-sm text-gray-400">
            Results per query (top K)
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={settings.topK}
            onChange={(e) =>
              setSettings({ topK: Number(e.target.value) || 5 })
            }
            className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-mono text-gray-200">{value}</span>
    </div>
  );
}
