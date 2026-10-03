"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { getTimeline } from "@/lib/api";
import { getSourceTheme } from "@/lib/sourceTheme";

export default function TimelinePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: getTimeline,
  });

  return (
    <div className="max-w-3xl text-foreground">
      <div className="mb-1 flex items-center gap-2">
        <Clock className="h-5 w-5 text-brand" />
        <h1 className="text-2xl font-semibold text-foreground">Memory Timeline</h1>
      </div>
      <p className="mb-6 text-sm text-muted">
        A chronological view of everything you&apos;ve learned.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Loading timeline…
        </div>
      )}

      {data && data.groups.length === 0 && (
        <div className="rounded-xl border-2 border-ink bg-card p-8 text-center text-sm text-muted">
          Nothing indexed yet. Ingest content to build your memory timeline.
        </div>
      )}

      <div className="space-y-8">
        {data?.groups.map((group) => (
          <div key={group.label}>
            <h2 className="mb-3 text-sm font-semibold text-foreground-2">
              {group.label}
            </h2>
            <div className="space-y-3 border-l-2 border-ink pl-4">
              {group.items.map((item) => {
                const srcTheme = getSourceTheme(item.source_type);
                const Icon = srcTheme.icon;
                return (
                  <div
                    key={item.source_id}
                    className="relative rounded-xl border-2 border-ink bg-card p-4 transition-all hover:border-brand/30 hover:shadow-card"
                  >
                    <span
                      className="absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full ring-4 ring-background"
                      style={{ backgroundColor: srcTheme.accent }}
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5" style={{ color: srcTheme.accent }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {srcTheme.name}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {item.title || item.source_id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
