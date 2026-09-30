"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Search as SearchIcon } from "lucide-react";
import { semanticSearch, getStats, SearchHit } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui";
import {
  EnhancedSearchBar,
  SourceFilterChips,
  ReasoningStrip,
  SearchResultCard,
  IntelligenceSidebar,
  SearchEmptyState,
  SearchNoResults,
} from "@/components/search";

type SortMode = "relevance" | "score" | "date";

function SearchPageInner() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchMeta, setSearchMeta] = useState({
    chunksSearched: 0,
    sourcesSearched: 0,
    embeddingsScanned: 0,
    searchTimeMs: 0,
  });

  const addSearch = useAppStore((s) => s.addSearch);
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q");

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 10000,
  });

  const mutation = useMutation({
    mutationFn: (params: { q: string; filter?: string }) =>
      semanticSearch(params.q, params.filter),
    onSuccess: (data, vars) => {
      addSearch(vars.q);
      setSearchResults(data.hits);
      // Only real backend metrics — never fabricate numbers.
      setSearchMeta({
        chunksSearched: data.chunks_searched ?? 0,
        sourcesSearched: data.sources_searched ?? 0,
        embeddingsScanned: data.chunks_searched ?? 0,
        searchTimeMs: data.search_time_ms ?? 0,
      });
      setHasSearched(true);
    },
    onError: () => {
      notify("Search failed. Is the backend running?", "error");
    },
  });

  const runSearch = useCallback(
    (q: string, f: string) => {
      if (q.trim()) mutation.mutate({ q, filter: f || undefined });
    },
    [mutation]
  );

  // OPEN-4: honor ?q= from the command palette / deep links
  useEffect(() => {
    if (qParam && qParam.trim()) {
      setQuery(qParam);
      mutation.mutate({ q: qParam, filter: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      runSearch(searchQuery, filter);
    },
    [runSearch, filter]
  );

  const handleDirectSearch = useCallback(() => {
    runSearch(query, filter);
  }, [query, filter, runSearch]);

  const isLoading = mutation.isPending;

  // Client-side sorting (Relevance = backend order, Score = desc, Date = newest title/alpha fallback)
  const hits = (() => {
    const arr = [...searchResults];
    if (sort === "score") arr.sort((a, b) => b.score - a.score);
    return arr;
  })();

  const hasResults = hits.length > 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold text-[#F5F5F5] tracking-tight">
              Semantic Search
            </h1>
            <Sparkles className="h-5 w-5 text-[#6E56CF]" />
          </div>
          <p className="mt-1 text-[13px] text-[#71717A]">
            Search across every chunk in your knowledge base.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-4 py-2.5 text-[12px] font-medium text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]">
          <SearchIcon className="h-4 w-4" />
          Search Tips
        </button>
      </motion.div>

      {/* Search Bar */}
      <EnhancedSearchBar
        query={query}
        setQuery={setQuery}
        onSearch={handleDirectSearch}
        loading={isLoading}
      />

      {/* Source Filters */}
      <div className="mt-4">
        <SourceFilterChips
          filter={filter}
          setFilter={(f) => {
            setFilter(f);
            if (query.trim()) {
              mutation.mutate({ q: query, filter: f || undefined });
            }
          }}
          stats={stats?.sources_by_type}
        />
      </div>

      {/* Main Content Area */}
      <div className="mt-6 flex gap-6">
        {/* Left Column - Results */}
        <div className="min-w-0 flex-1" style={{ flex: "0 0 65%" }}>
          {/* Reasoning Strip */}
          <AnimatePresence>
            {(isLoading || hasSearched) && (
              <div className="mb-4">
                <ReasoningStrip
                  loading={isLoading}
                  chunksSearched={searchMeta.chunksSearched}
                  sourcesSearched={searchMeta.sourcesSearched}
                  embeddingsScanned={searchMeta.embeddingsScanned}
                  resultCount={hits.length}
                  searchTimeMs={searchMeta.searchTimeMs}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Results Header */}
          {hasSearched && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 flex items-center justify-between"
            >
              <span className="text-[13px] text-[#71717A]">
                Found{" "}
                <span className="font-semibold text-[#F5F5F5]">{hits.length}</span>{" "}
                highly relevant results
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#52525B]">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#111318] px-3 py-1.5 text-[11px] text-[#A1A1AA] outline-none"
                >
                  <option value="relevance">Relevance</option>
                  <option value="score">Score</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Search Results */}
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="skeleton h-40 rounded-[18px] border border-[rgba(255,255,255,0.04)] bg-[#111318]"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </motion.div>
              )}

              {!isLoading && hasSearched && hasResults && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {hits.map((hit, i) => (
                    <SearchResultCard key={`${hit.source_id}-${i}`} hit={hit} index={i} />
                  ))}
                </motion.div>
              )}

              {!isLoading && hasSearched && !hasResults && (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SearchNoResults
                    query={query}
                    chunksSearched={searchMeta.chunksSearched}
                    sourcesSearched={searchMeta.sourcesSearched}
                    embeddingsScanned={searchMeta.embeddingsScanned}
                    onSearch={handleSearch}
                  />
                </motion.div>
              )}

              {!hasSearched && !isLoading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <SearchEmptyState onSearch={handleSearch} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column - Intelligence Sidebar */}
        <div style={{ flex: "0 0 35%" }} className="min-w-0">
          <IntelligenceSidebar
            hits={hits}
            stats={stats}
            query={query}
            chunksSearched={searchMeta.chunksSearched}
            searchTimeMs={searchMeta.searchTimeMs}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

// useSearchParams() requires a Suspense boundary for `next build`
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
