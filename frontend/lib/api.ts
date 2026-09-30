import axios from "axios";
import { useAppStore } from "./store";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

export interface VideoMetadata {
  video_id: string;
  title?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  published_at?: string;
}

export interface VideoProcessResponse {
  video_id: string;
  metadata: VideoMetadata;
  summary?: string;
  key_topics: string[];
  chunks_indexed: number;
  processed_at: string;
}

export interface SearchHit {
  score: number;
  text: string;
  source_id: string;
  source_type: string;
  title?: string;
  summary?: string;
  thumbnail?: string;
  duration?: number;
  author?: string;
  created_at?: string;
  chunks?: number;
  entities?: string[];
  tags?: string[];
  url?: string;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  search_time_ms?: number;
  chunks_searched?: number;
  sources_searched?: number;
}

export interface Citation {
  source_id: string;
  source_type: string;
  title?: string;
  snippet: string;
  url?: string;
  thumbnail?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  question: string;
  answer: string;
  citations: Citation[];
  search_time_ms?: number;
  chunks_searched?: number;
  sources_searched?: number;
}

export interface SourceItem {
  source_id: string;
  source_type: string;
  title?: string;
  channel?: string;
  thumbnail?: string;
  summary?: string;
  key_topics: string[];
  chunks_indexed: number;
  created_at: string;
  url?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  page_count?: number;
}

export interface RecentQuery {
  text: string;
  created_at: string;
}

export interface Stats {
  indexed_chunks: number;
  total_sources: number;
  sources_by_type: Record<string, number>;
  vector_store: string;
  recent_sources: SourceItem[];
  recent_searches: RecentQuery[];
  recent_questions: RecentQuery[];
  knowledge_growth: { date: string; name: string; chunks: number }[];
}

export const processVideo = (url: string) =>
  api.post<VideoProcessResponse>("/videos/process", { url }).then((r) => r.data);

export const processInstagram = (url: string) =>
  api.post<SourceItem>("/instagram/process", { url }).then((r) => r.data);

export const processWeb = (url: string) =>
  api.post<SourceItem>("/web/process", { url }).then((r) => r.data);

const uploadFile = (path: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<SourceItem>(path, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const processPdf = (file: File) => uploadFile("/pdf/process", file);
export const processDocument = (file: File) =>
  uploadFile("/documents/process", file);
export const processAudio = (file: File) => uploadFile("/audio/process", file);

export const semanticSearch = (
  query: string,
  sourceType?: string,
  topK?: number
) =>
  api
    .post<SearchResponse>("/search", {
      query,
      source_type: sourceType,
      top_k: topK ?? useAppStore.getState().settings.topK,
    })
    .then((r) => r.data);

export const askChat = (
  question: string,
  sourceType?: string,
  sourceId?: string,
  history?: ChatMessage[],
  topK?: number
) =>
  api
    .post<ChatResponse>("/chat", {
      question,
      source_type: sourceType || undefined,
      source_id: sourceId || undefined,
      history: history || [],
      top_k: topK ?? useAppStore.getState().settings.topK,
    })
    .then((r) => r.data);

export const SOURCE_TYPES = [
  "",
  "youtube",
  "instagram",
  "pdf",
  "document",
  "audio",
  "web",
] as const;

export interface HealthStatus {
  status: string;
  app: string;
  environment: string;
  version: string;
}

export interface DetailedHealth {
  status: string;
  app: string;
  environment: string;
  version: string;
  llm_model: string;
  embedding_model: string;
  collection: string;
  checks: Record<string, string>;
}

export const getStats = () =>
  api.get<Stats>("/stats").then((r) => r.data);

export const getHealth = () =>
  api.get<HealthStatus>("/health").then((r) => r.data);

export const getDetailedHealth = () =>
  api.get<DetailedHealth>("/health/detailed").then((r) => r.data);

export const listSources = (sourceType?: string, page: number = 1, pageSize: number = 20) =>
  api
    .get<{ items: SourceItem[]; total: number; page: number; page_size: number; total_pages: number }>(
      "/sources",
      {
        params: {
          ...(sourceType ? { source_type: sourceType } : {}),
          page,
          page_size: pageSize,
        },
      }
    )
    .then((r) => r.data);

export interface GraphNode {
  id: string;
  label: string;
  count: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  source_id: string;
  source_type: string;
  title?: string;
}

export const getGraph = () =>
  api
    .get<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/graph")
    .then((r) => r.data);

export interface TimelineItem {
  source_id: string;
  source_type: string;
  title?: string;
  created_at: string;
}

export interface TimelineGroup {
  label: string;
  items: TimelineItem[];
}

export const getTimeline = () =>
  api.get<{ groups: TimelineGroup[] }>("/timeline").then((r) => r.data);

export interface CompareResult {
  analysis: string;
  source_a: string;
  source_b: string;
}

export const compareSources = (sourceIdA: string, sourceIdB: string) =>
  api
    .post<CompareResult>("/compare", {
      source_id_a: sourceIdA,
      source_id_b: sourceIdB,
    })
    .then((r) => r.data);

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export const listNotes = () =>
  api.get<Note[]>("/notes").then((r) => r.data);

export const createNote = (title: string, body: string) =>
  api.post<Note>("/notes", { title, body }).then((r) => r.data);

export const deleteNote = (id: string) =>
  api.delete<{ deleted: string }>(`/notes/${id}`).then((r) => r.data);

export const deleteSource = (sourceId: string) =>
  api.delete<{ deleted: string; message: string }>(`/sources/${sourceId}`).then((r) => r.data);

export const downloadSource = (sourceId: string, fileName?: string) => {
  const url = `${API_URL}/api/sources/${sourceId}/download`;
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "download";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
