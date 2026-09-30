"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Library, Download, Trash2, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";
import { listSources, downloadSource, deleteSource, SOURCE_TYPES, SourceItem, API_URL } from "@/lib/api";
import {
  Badge,
  Card,
  CardSkeleton,
  EmptyState,
  PageHeader,
} from "@/components/ui";

export default function StoredPage() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ["sources", filter, page],
    queryFn: () => listSources(filter || undefined, page, pageSize),
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });

  const handleDownload = (source: SourceItem) => {
    if (source.file_path) {
      downloadSource(source.source_id, source.file_name);
    }
  };

  const handleDelete = (sourceId: string) => {
    if (confirm("Are you sure you want to delete this source? This action cannot be undone.")) {
      deleteMutation.mutate(sourceId);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canDownload = (source: SourceItem) => {
    // Can download if it's a file-based source with stored file
    return source.file_path && ["pdf", "document", "audio"].includes(source.source_type);
  };

  const getOpenUrl = (source: SourceItem): string | null => {
    // Only treat real http(s) strings as URLs. `channel` usually holds a
    // channel NAME (e.g. "MrBeast"), never a link.
    if (source.url && /^https?:\/\//.test(source.url)) return source.url;
    if (source.channel && /^https?:\/\//.test(source.channel)) return source.channel;
    return null;
  };

  const canOpenOriginal = (source: SourceItem) => getOpenUrl(source) !== null;

  const canViewInline = (source: SourceItem) =>
    !!source.file_path && ["pdf", "document", "audio"].includes(source.source_type);

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Stored Sources"
        subtitle={`Everything indexed in your knowledge base. ${data?.total ?? 0} total sources.`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {SOURCE_TYPES.map((f) => (
          <button
            key={f || "all"}
            onClick={() => { setFilter(f); setPage(1); }}
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
        {data?.items.map((s) => (
          <Card key={s.source_id} className="p-4 relative group">
            {s.thumbnail && (
              <div className="mb-2 -mx-4 -mt-4">
                <img 
                  src={s.thumbnail} 
                  alt={s.title || "Thumbnail"}
                  className="w-full h-32 object-cover rounded-t-lg"
                />
              </div>
            )}
            <div className="mb-1 text-xs uppercase text-brand">
              {s.source_type}
              {s.file_size && (
                <span className="ml-2 text-gray-500">{formatFileSize(s.file_size)}</span>
              )}
            </div>
            <h3 className="mb-1 font-medium">
              {getOpenUrl(s) ? (
                <a
                  href={getOpenUrl(s) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition"
                >
                  {s.title || s.source_id}
                </a>
              ) : canViewInline(s) ? (
                <a
                  href={`${API_URL}/api/sources/${s.source_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand transition"
                >
                  {s.title || s.source_id}
                </a>
              ) : (
                s.title || s.source_id
              )}
            </h3>
            {s.channel && (
              <p className="mb-2 text-xs text-gray-500 truncate">{s.channel}</p>
            )}
            <p className="line-clamp-3 text-sm text-gray-400">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {s.key_topics.slice(0, 4).map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            
            {/* Action buttons — always visible on touch/small screens */}
            <div className="mt-4 flex items-center gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              {canDownload(s) && (
                <button
                  onClick={() => handleDownload(s)}
                  className="flex items-center gap-1 rounded-lg bg-brand/20 px-3 py-1.5 text-xs text-brand hover:bg-brand/30 transition"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              )}
              {canViewInline(s) && (
                <a
                  href={`${API_URL}/api/sources/${s.source_id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/30 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              )}
              {canOpenOriginal(s) && (
                <a
                  href={getOpenUrl(s) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-gray-500/20 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-500/30 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              )}
              <button
                onClick={() => handleDelete(s.source_id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30 transition ml-auto"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-3 w-3" />
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {data && data.items.length === 0 && !isLoading && (
        <EmptyState
          icon={<Library className="h-6 w-6" />}
          title="No sources yet"
          hint="Add a YouTube video, PDF, or web page to get started."
        />
      )}
    </div>
  );
}
