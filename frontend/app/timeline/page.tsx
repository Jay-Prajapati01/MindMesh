"use client";

import { useQuery } from "@tanstack/react-query";
import { getTimeline } from "@/lib/api";

export default function TimelinePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: getTimeline,
  });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Memory Timeline</h1>
      <p className="mb-6 text-sm text-gray-400">
        A chronological view of everything you&apos;ve learned.
      </p>

      {isLoading && <p className="text-sm text-gray-400">Loading...</p>}
      {data && data.groups.length === 0 && (
        <p className="text-sm text-gray-400">Nothing indexed yet.</p>
      )}

      <div className="space-y-8">
        {data?.groups.map((group) => (
          <div key={group.label}>
            <h2 className="mb-3 text-sm font-semibold text-gray-300">
              {group.label}
            </h2>
            <div className="space-y-2 border-l border-white/10 pl-4">
              {group.items.map((item) => (
                <div
                  key={item.source_id}
                  className="relative rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <span className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-brand" />
                  <div className="text-xs uppercase text-brand">
                    {item.source_type}
                  </div>
                  <div className="text-sm">{item.title || item.source_id}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
