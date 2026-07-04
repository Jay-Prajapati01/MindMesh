"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Youtube,
  Instagram,
  FileText,
  Files,
  Mic,
  Globe,
  Network,
  Clock,
  GitCompare,
  MessageSquare,
  Library,
  Settings,
  Home,
  LayoutGrid,
  Plus,
  Command,
  ArrowRight,
  History,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Youtube;
  color: string;
  href?: string;
  action?: () => void;
  category: "navigation" | "action" | "search" | "recent";
  shortcut?: string;
}

const NAVIGATION_ITEMS: Omit<CommandItem, "category">[] = [
  { id: "dashboard", label: "Dashboard", description: "Mission Control Center", icon: Home, color: "#6E56CF", href: "/", shortcut: "⌘1" },
  { id: "workspace", label: "Workspace", description: "Notes and tools", icon: LayoutGrid, color: "#6E56CF", href: "/workspace" },
  { id: "search", label: "Semantic Search", description: "Explore your knowledge", icon: Search, color: "#6E56CF", href: "/search" },
  { id: "chat", label: "Ask AI", description: "Chat with your knowledge", icon: MessageSquare, color: "#6E56CF", href: "/chat" },
  { id: "graph", label: "Knowledge Graph", description: "Visualize connections", icon: Network, color: "#0EA5E9", href: "/graph" },
  { id: "timeline", label: "Timeline", description: "Chronological view", icon: Clock, color: "#F59E0B", href: "/timeline" },
  { id: "compare", label: "Compare", description: "Compare sources", icon: GitCompare, color: "#22C55E", href: "/compare" },
  { id: "stored", label: "Stored", description: "Browse all sources", icon: Library, color: "#71717A", href: "/stored" },
  { id: "settings", label: "Settings", description: "App configuration", icon: Settings, color: "#71717A", href: "/settings" },
];

const ACTION_ITEMS: Omit<CommandItem, "category">[] = [
  { id: "add-youtube", label: "Add YouTube Video", description: "Extract & summarize video content", icon: Youtube, color: "#EF4444", href: "/youtube" },
  { id: "add-instagram", label: "Add Instagram Reel", description: "Extract captions and on-screen text", icon: Instagram, color: "#E1306C", href: "/instagram" },
  { id: "add-pdf", label: "Upload PDF", description: "Extract text and analyze", icon: FileText, color: "#DC2626", href: "/pdf" },
  { id: "add-document", label: "Upload Document", description: "Process document files", icon: Files, color: "#7C3AED", href: "/documents" },
  { id: "add-audio", label: "Upload Audio", description: "Transcribe with Whisper AI", icon: Mic, color: "#059669", href: "/audio" },
  { id: "add-web", label: "Add Website", description: "Parse and index web content", icon: Globe, color: "#0EA5E9", href: "/web" },
];

export function CommandPalette() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const recentSearches = useAppStore((s) => s.recentSearches);

  const recentItems: CommandItem[] = recentSearches.slice(0, 3).map((q) => ({
    id: `recent-${q}`,
    label: q,
    icon: History,
    color: "#71717A",
    category: "recent" as const,
    action: () => {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
  }));

  const allItems: CommandItem[] = [
    ...NAVIGATION_ITEMS.map((item) => ({ ...item, category: "navigation" as const })),
    ...ACTION_ITEMS.map((item) => ({ ...item, category: "action" as const })),
    ...recentItems,
  ];

  const filtered = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const grouped = {
    navigation: filtered.filter((i) => i.category === "navigation"),
    action: filtered.filter((i) => i.category === "action"),
    recent: filtered.filter((i) => i.category === "recent"),
  };

  const flatFiltered = [...grouped.navigation, ...grouped.action, ...grouped.recent];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const executeItem = useCallback(
    (item: CommandItem) => {
      if (item.action) {
        item.action();
      } else if (item.href) {
        setOpen(false);
        router.push(item.href);
      }
    },
    [router, setOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
      executeItem(flatFiltered[selectedIndex]);
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[560px] overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111318] shadow-2xl shadow-black/50"
        >
          <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
            <Search className="h-4 w-4 text-[#71717A]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, pages, or actions..."
              className="flex-1 bg-transparent text-[14px] text-[#F5F5F5] placeholder-[#52525B] outline-none"
            />
            <div className="flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.04)] px-2 py-1">
              <span className="text-[10px] text-[#71717A]">ESC</span>
            </div>
          </div>

          <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
            {flatFiltered.length === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <Search className="mb-2 h-6 w-6 text-[#52525B]" />
                <p className="text-[12px] text-[#71717A]">No results found</p>
              </div>
            )}

            {grouped.navigation.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  Navigation
                </div>
                {grouped.navigation.map((item, i) => {
                  const flatIndex = i;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                        selectedIndex === flatIndex
                          ? "bg-[rgba(255,255,255,0.06)]"
                          : "hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#F5F5F5]">{item.label}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#71717A]">{item.description}</div>
                        )}
                      </div>
                      {item.shortcut && (
                        <span className="text-[10px] text-[#52525B]">{item.shortcut}</span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-[#52525B]" />
                    </button>
                  );
                })}
              </div>
            )}

            {grouped.action.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  Add Source
                </div>
                {grouped.action.map((item, i) => {
                  const flatIndex = grouped.navigation.length + i;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                        selectedIndex === flatIndex
                          ? "bg-[rgba(255,255,255,0.06)]"
                          : "hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#F5F5F5]">{item.label}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#71717A]">{item.description}</div>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[#52525B]" />
                    </button>
                  );
                })}
              </div>
            )}

            {grouped.recent.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  Recent Searches
                </div>
                {grouped.recent.map((item, i) => {
                  const flatIndex = grouped.navigation.length + grouped.action.length + i;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                        selectedIndex === flatIndex
                          ? "bg-[rgba(255,255,255,0.06)]"
                          : "hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-[rgba(255,255,255,0.04)]">
                        <Icon className="h-4 w-4 text-[#71717A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[#A1A1AA]">{item.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-[rgba(255,255,255,0.06)] px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-[10px] text-[#52525B]">
              <span className="rounded bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5">↑↓</span>
              Navigate
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-[#52525B]">
              <span className="rounded bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5">↵</span>
              Select
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-[#52525B]">
              <span className="rounded bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5">ESC</span>
              Close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
