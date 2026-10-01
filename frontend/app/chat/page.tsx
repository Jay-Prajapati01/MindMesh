"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Search as SearchIcon, HelpCircle, MessageSquare } from "lucide-react";
import { askChat, ChatResponse, ChatMessage, getStats, SourceItem } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  ChatInput,
  SourceFilterChips,
  AnswerCard,
  FollowUpInput,
  ChatSidebar,
  ChatEmptyState,
  ChatLoadingState,
  ChatErrorState,
} from "@/components/chat";

export default function ChatPage() {
  // useSearchParams() requires a Suspense boundary for `next build`
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source") || "";
  const sourceIdParam = searchParams.get("sourceId") || "";
  const titleParam = searchParams.get("title") || "";
  const summaryParam = searchParams.get("summary") || "";
  const qParam = searchParams.get("q") || "";

  const initialQuerySent = useRef(false);

  const [query, setQuery] = useState(() => {
    if (qParam) return qParam;
    if (titleParam) {
      return `Tell me about "${titleParam}"`;
    }
    return "";
  });
  const [filter, setFilter] = useState(sourceParam);
  const [sourceId, setSourceId] = useState(sourceIdParam);
  const [history, setHistory] = useState<(ChatResponse & { searchHits?: any[] })[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const addQuestion = useAppStore((s) => s.addQuestion);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 10000,
  });

  const mutation = useMutation({
    mutationFn: (q: string) =>
      askChat(q, filter || undefined, sourceId || undefined, chatHistory),
    onSuccess: (data) => {
      setHistory((h) => [...h, { ...data, searchHits: [] }]);
      setChatHistory((h) => [
        ...h,
        { role: "user", content: data.question },
        { role: "assistant", content: data.answer },
      ]);
      addQuestion(data.question);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setError(null);
    },
    onError: (err: any, failedQuestion) => {
      setError(err?.message || "Failed to generate answer. Is the backend running?");
      // Restore the question so the user's input is not lost on failure.
      if (typeof failedQuestion === "string" && failedQuestion.trim()) {
        setQuery(failedQuestion);
      }
    },
  });

  const handleSend = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      setQuery("");
      setError(null);
      mutation.mutate(q);
    },
    [mutation]
  );

  const handleDirectSend = useCallback(() => {
    if (query.trim()) {
      handleSend(query);
    }
  }, [query, handleSend]);

  // Auto-send when navigated from another page with context params.
  // Depends only on stable values: `mutation` (and therefore `handleSend`)
  // changes identity every render, which would cancel the timer forever.
  useEffect(() => {
    if ((titleParam || qParam) && !initialQuerySent.current && query.trim()) {
      initialQuerySent.current = true;
      const timer = setTimeout(() => {
        mutation.mutate(query);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleParam, qParam, query]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    setChatHistory([]);
  }, []);

  const isLoading = mutation.isPending;
  const hasHistory = history.length > 0;
  const lastResponse = history[history.length - 1];

  const relatedQuestions = [
    "What are the key insights from this answer?",
    "How does this connect to other sources?",
    "What are the main arguments presented?",
    "Can you compare this with my other content?",
    "What evidence supports this answer?",
    "What are the implications of this?",
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex flex-wrap items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold text-[#F5F5F5] tracking-tight">
              Ask AI
            </h1>
            <Sparkles className="h-5 w-5 text-[#6E56CF]" />
          </div>
          <p className="mt-1 text-[13px] text-[#71717A]">
            One question, answered across everything you&apos;ve indexed. Grounded with citations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.04)] px-2.5 py-1.5">
            <Sparkles className="h-3 w-3 text-[#71717A]" />
            <span className="text-[11px] font-medium text-[#71717A]">⌘K</span>
          </div>
          {hasHistory && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-4 py-2.5 text-[12px] font-medium text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
            >
              New Chat
            </button>
          )}
          <button className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] px-4 py-2.5 text-[12px] font-medium text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]">
            <HelpCircle className="h-4 w-4" />
            Ask Tips
          </button>
        </div>
      </motion.div>

      {/* Source Filters */}
      <div className="mb-5">
        <SourceFilterChips
          filter={filter}
          setFilter={(f) => setFilter(f)}
          stats={stats?.sources_by_type}
        />
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <ChatInput
          query={query}
          setQuery={setQuery}
          onSend={handleDirectSend}
          loading={isLoading}
        />
      </div>

      {/* Main Content Area: 70/30 (stacks vertically below lg) */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Column — 70% */}
        <div className="min-w-0 flex-1 lg:flex-[0_0_68%]">
          <AnimatePresence mode="wait">
            {/* Loading State */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ChatLoadingState />
              </motion.div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ChatErrorState
                  error={error}
                  onRetry={() => {
                    setError(null);
                    if (lastResponse) {
                      mutation.mutate(lastResponse.question);
                    }
                  }}
                  onBroaden={() => {
                    setFilter("");
                    if (lastResponse) {
                      mutation.mutate(lastResponse.question);
                    }
                  }}
                />
              </motion.div>
            )}

            {/* Empty State */}
            {!isLoading && !hasHistory && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ChatEmptyState onQuestionClick={handleSend} />
              </motion.div>
            )}

            {/* Answer Results */}
            {!isLoading && hasHistory && !error && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {history.map((item, i) => (
                  <div key={i} className="space-y-4">
                    {/* User Question */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[80%] rounded-[16px] rounded-br-[4px] bg-[#6E56CF]/15 px-5 py-3 text-[13px] text-[#F5F5F5]">
                        {item.question}
                      </div>
                    </motion.div>

                    {/* AI Answer */}
                    <AnswerCard
                      response={item}
                      stats={stats}
                      searchHits={item.searchHits}
                      index={i}
                    />

                    {/* Follow-up Input (only after last response) */}
                    {i === history.length - 1 && !isLoading && (
                      <FollowUpInput
                        onSend={handleSend}
                        loading={isLoading}
                      />
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar — 30% (moves below the chat on small screens) */}
        <div className="w-full min-w-0 lg:w-auto lg:flex-[0_0_32%]">
          <div className="sticky top-4">
            <ChatSidebar
              stats={stats}
              lastResponse={lastResponse ? {
                chunksSearched: lastResponse.chunks_searched,
                sourcesSearched: lastResponse.sources_searched,
                citations: lastResponse.citations?.length ?? 0,
                searchTimeMs: lastResponse.search_time_ms,
              } : undefined}
              relatedQuestions={hasHistory ? relatedQuestions : []}
              onQuestionClick={handleSend}
              onAction={(action) => {
                if (lastResponse) {
                  handleSend(`${action}: ${lastResponse.question}`);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
