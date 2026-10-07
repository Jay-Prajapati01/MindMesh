"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, HelpCircle, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  api,
  askChat,
  ChatResponse,
  ChatMessage,
  getStats,
  processPdf,
  processDocument,
  processAudio,
} from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  ChatInput,
  SourceFilterChips,
  AnswerCard,
  FollowUpInput,
  ChatEmptyState,
  ChatLoadingState,
  ChatErrorState,
} from "@/components/chat";

type UploadStatus =
  | { status: "uploading" | "done" | "error"; name: string; message?: string };

const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "mp4", "webm"];

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
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [history, setHistory] = useState<ChatResponse[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [upload, setUpload] = useState<UploadStatus | null>(null);
  const addQuestion = useAppStore((s) => s.addQuestion);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const id = sessionStorage.getItem("mindmesh-chat-id");
    if (!id || sourceIdParam || qParam) return;
    api.get(`/chat/conversations/${encodeURIComponent(id)}`).then(({ data }) => {
      setConversationId(id);
      const responses: ChatResponse[] = data.turns.map((t: { response: ChatResponse }) => t.response);
      setHistory(responses);
      setChatHistory(responses.flatMap(r => [{ role: "user" as const, content: r.question }, { role: "assistant" as const, content: r.answer }]));
    }).catch(() => sessionStorage.removeItem("mindmesh-chat-id"));
  }, [sourceIdParam, qParam]);

  const mutation = useMutation({
    mutationFn: (q: string) =>
      askChat(q, filter || undefined, sourceId || undefined, chatHistory, undefined, conversationId),
    onMutate: (q) => {
      setPendingQuestion(q);
    },
    onSuccess: (data) => {
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        sessionStorage.setItem("mindmesh-chat-id", data.conversation_id);
      }
      setHistory((h) => [...h, data]);
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

  const handleFile = useCallback(
    async (file: File) => {
      setUpload({ status: "uploading", name: file.name });
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (ext === "pdf") {
          await processPdf(file);
        } else if (AUDIO_EXTENSIONS.includes(ext)) {
          await processAudio(file);
        } else {
          await processDocument(file);
        }
        setUpload({ status: "done", name: file.name });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["sources"] });
        setTimeout(() => setUpload(null), 4000);
      } catch (err: any) {
        setUpload({
          status: "error",
          name: file.name,
          message:
            err?.response?.data?.detail || err?.message || "Upload failed. Please try again.",
        });
        setTimeout(() => setUpload(null), 8000);
      }
    },
    [queryClient]
  );

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
    setConversationId(undefined);
    sessionStorage.removeItem("mindmesh-chat-id");
  }, []);

  const isLoading = mutation.isPending;
  const hasHistory = history.length > 0;
  const lastResponse = history[history.length - 1];

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
            <h1 className="text-[24px] font-bold text-foreground tracking-tight">
              Ask AI
            </h1>
            <Sparkles className="h-5 w-5 text-[#FF5C00]" />
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Chat with everything you&apos;ve indexed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-surface px-2.5 py-1.5">
            <Sparkles className="h-3 w-3 text-muted" />
            <span className="text-[11px] font-medium text-muted">⌘K</span>
          </div>
          {hasHistory && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 rounded-[12px] border-2 border-ink bg-card px-4 py-2.5 text-[12px] font-medium text-foreground-3 transition-all hover:bg-surface hover:text-foreground"
            >
              New Chat
            </button>
          )}
          <button className="flex items-center gap-2 rounded-[12px] border-2 border-ink bg-card px-4 py-2.5 text-[12px] font-medium text-foreground-3 transition-all hover:bg-surface hover:text-foreground">
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
          onFile={handleFile}
          uploading={upload?.status === "uploading"}
        />
        {upload && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-2 text-[12px]"
          >
            {upload.status === "uploading" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5C00]" />
                <span className="text-muted">
                  Uploading &amp; indexing <span className="text-foreground">{upload.name}</span>…
                </span>
              </>
            )}
            {upload.status === "done" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#FF5C00]" />
                <span className="text-foreground">
                  {upload.name} indexed — ask about it now.
                </span>
              </>
            )}
            {upload.status === "error" && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500">
                  {upload.name}: {upload.message}
                </span>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Conversation */}
      <AnimatePresence mode="wait">
        {/* Loading State */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Show the question immediately, like a normal chatbot */}
            {pendingQuestion && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-[16px] rounded-br-[4px] bg-[#FF5C00]/15 px-5 py-3 text-[13px] text-foreground">
                  {pendingQuestion}
                </div>
              </div>
            )}
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
                  <div className="max-w-[80%] rounded-[16px] rounded-br-[4px] bg-[#FF5C00]/15 px-5 py-3 text-[13px] text-foreground">
                    {item.question}
                  </div>
                </motion.div>

                {/* AI Answer */}
                <AnswerCard response={item} index={i} />

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
  );
}
