"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Library } from "lucide-react";
import { listSources, SOURCE_TYPES } from "@/lib/api";
import {
  Badge,
  Card,
  CardSkeleton,
  EmptyState,
  PageHeader,
} from "@/components/ui";

export default function StoredPage() {
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["sources", filter],
    queryFn: () => listSources(filter || undefined),
  });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Stored Sources"
        subtitle="Everything indexed in your knowledge base."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {SOURCE_TYPES.map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs capitalize transition ${
              filter === f
                ? "bg-brand text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {f || "all"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data?.map((s) => (
          <Card key={s.source_id} className="p-4">
            <div className="mb-1 text-xs uppercase text-brand">
              {s.source_type}
            </div>
            <h3 className="mb-1 font-medium">{s.title || s.source_id}</h3>
            {s.channel && (
              <p className="mb-2 text-xs text-gray-500">{s.channel}</p>
            )}
            <p className="line-clamp-3 text-sm text-gray-400">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {s.key_topics.slice(0, 4).map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {data && data.length === 0 && !isLoading && (
        <EmptyState
          icon={<Library className="h-6 w-6" />}
          title="No sources yet"
          hint="Add a YouTube video, PDF, or web page to get started."
        />
      )}
    </div>
  );
}
