"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Plus,
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
  LayoutGrid,
  Boxes,
  Database,
  Activity,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Command,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { getStats, Stats } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  CommandPalette,
  NotificationCenter,
  ActivityFeed,
  BackgroundTasks,
  SettingsDropdown,
  AISummaryBrief,
  LiveSystemStatus,
} from "@/components/dashboard";
import { AnimatedCounter } from "@/components/search/AnimatedCounter";

const PIE_COLORS = ["#EF4444", "#E1306C", "#DC2626", "#7C3AED", "#059669", "#0EA5E9"];

function getSourceIcon(type: string) {
  switch (type) {
    case "youtube": return <Youtube className="h-4 w-4 text-red-500" />;
    case "instagram": return <Instagram className="h-4 w-4 text-pink-500" />;
    case "pdf": return <FileText className="h-4 w-4 text-red-400" />;
    case "document": return <Files className="h-4 w-4 text-purple-500" />;
    case "audio": return <Mic className="h-4 w-4 text-green-500" />;
    case "web": return <Globe className="h-4 w-4 text-blue-500" />;
    default: return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

function getSourceColor(type: string) {
  switch (type) {
    case "youtube": return "#EF4444";
    case "instagram": return "#E1306C";
    case "pdf": return "#DC2626";
    case "document": return "#7C3AED";
    case "audio": return "#059669";
    case "web": return "#0EA5E9";
    default: return "#71717A";
  }
}

function timeAgo(date: string | Date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", emoji: "\u2600\uFE0F" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "\uD83D\uDC4B" };
  if (hour >= 17 && hour < 21) return { text: "Good evening", emoji: "\uD83C\uDF07" };
  return { text: "Good night", emoji: "\uD83C\uDF19" };
}

function getCurrentTime() {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const day = days[now.getDay()];
  const month = months[now.getMonth()];
  const date = now.getDate();
  const hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return {
    date: `${day}, ${month} ${date}`,
    time: `${h12}:${mins} ${ampm}`,
  };
}

const ADD_SOURCE_ITEMS = [
  { icon: Youtube, label: "YouTube Video", desc: "Extract & summarize", color: "#EF4444", href: "/youtube" },
  { icon: Instagram, label: "Instagram Reel", desc: "Extract captions", color: "#E1306C", href: "/instagram" },
  { icon: FileText, label: "Upload PDF", desc: "Extract and analyze", color: "#DC2626", href: "/pdf" },
  { icon: Files, label: "Upload Document", desc: "Process document files", color: "#7C3AED", href: "/documents" },
  { icon: Mic, label: "Upload Audio", desc: "Transcribe with AI", color: "#059669", href: "/audio" },
  { icon: Globe, label: "Add Website", desc: "Parse web content", color: "#0EA5E9", href: "/web" },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const greeting = useMemo(() => getGreeting(), []);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const addSourceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addSourceRef.current && !addSourceRef.current.contains(e.target as Node)) {
        setAddSourceOpen(false);
      }
    };
    if (addSourceOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addSourceOpen]);

  const knowledgeGrowthData = useMemo(() => {
    if (stats?.knowledge_growth && stats.knowledge_growth.length > 0) {
      return stats.knowledge_growth;
    }
    return [
      { name: "Mon", chunks: 0 },
      { name: "Tue", chunks: 0 },
      { name: "Wed", chunks: 0 },
      { name: "Thu", chunks: 0 },
      { name: "Fri", chunks: 0 },
      { name: "Sat", chunks: 0 },
      { name: "Sun", chunks: 0 },
    ];
  }, [stats]);

  const contentDistributionData = useMemo(() => {
    if (!stats?.sources_by_type) return [];
    const total = Object.values(stats.sources_by_type).reduce((a, b) => a + b, 0);
    return Object.entries(stats.sources_by_type)
      .map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: getSourceColor(type),
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  return (
    <div className="min-h-screen">
      <CommandPalette />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[#111318] via-[#111318] to-[#6E56CF]/5 p-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[32px] font-bold text-[#F5F5F5] tracking-tight"
            >
              {greeting.text}, Jay <span className="inline-block">{greeting.emoji}</span>
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-1 flex items-center gap-3"
            >
              <span className="text-[13px] text-[#71717A]">{currentTime.date}</span>
              <span className="text-[13px] font-semibold text-[#A1A1AA]">{currentTime.time}</span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-1 text-[13px] text-[#71717A]"
            >
              Your personal intelligence operating system.
            </motion.p>

            <AISummaryBrief stats={stats} isLoading={isLoading} />

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-5 flex flex-wrap items-center gap-5"
            >
              {[
                { icon: Boxes, label: "Knowledge Chunks", value: stats?.indexed_chunks ?? 0, color: "#6E56CF" },
                { icon: Database, label: "Sources", value: stats?.total_sources ?? 0, color: "#22C55E" },
                { icon: Network, label: "Embeddings", value: Math.round((stats?.indexed_chunks ?? 0) * 1.5), color: "#0EA5E9" },
                { icon: Activity, label: "Active Collection", value: 1, color: "#F59E0B" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${stat.color}10` }}
                  >
                    <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-[#F5F5F5]">
                      {isLoading ? "..." : <AnimatedCounter value={stat.value} />}
                    </div>
                    <div className="text-[11px] text-[#71717A]">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-end gap-3"
          >
            {/* Search Bar */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex w-full lg:w-80 items-center gap-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#171A22] px-4 py-3 text-left transition-all hover:border-[#6E56CF]/30 hover:shadow-[0_0_0_2px_rgba(110,86,207,0.1)]"
            >
              <Search className="h-4 w-4 text-[#71717A]" />
              <span className="flex-1 text-[13px] text-[#52525B]">Search your knowledge...</span>
              <div className="flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.05)] px-2 py-1">
                <Command className="h-3 w-3 text-[#71717A]" />
                <span className="text-[11px] text-[#71717A]">K</span>
              </div>
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <div ref={addSourceRef} className="relative">
                <button
                  onClick={() => setAddSourceOpen(!addSourceOpen)}
                  className="flex items-center gap-2 rounded-[12px] bg-[#6E56CF] px-4 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-[#7C69E3] shadow-lg shadow-[#6E56CF]/20"
                >
                  <Plus className="h-4 w-4" />
                  Add Source
                </button>
                <AnimatePresence>
                  {addSourceOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-[260px] overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#111318] shadow-2xl shadow-black/50"
                    >
                      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
                        <h3 className="text-[12px] font-semibold text-[#F5F5F5]">Add Source</h3>
                      </div>
                      <div className="p-2">
                        {ADD_SOURCE_ITEMS.map((item) => (
                          <a
                            key={item.label}
                            href={item.href}
                            onClick={() => setAddSourceOpen(false)}
                            className="group flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                          >
                            <div
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]"
                              style={{ backgroundColor: `${item.color}15` }}
                            >
                              <item.icon className="h-4 w-4" style={{ color: item.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium text-[#F5F5F5]">{item.label}</div>
                              <div className="text-[10px] text-[#71717A]">{item.desc}</div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-[#52525B] group-hover:text-[#6E56CF] transition-colors" />
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <NotificationCenter />
              <SettingsDropdown />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Indexed Chunks */}
        <div className="group rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5 transition-all hover:border-[#6E56CF]/30 hover:shadow-lg hover:shadow-[#6E56CF]/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#6E56CF]/10">
              <Boxes className="h-5 w-5 text-[#6E56CF]" />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#22C55E]">
              <TrendingUp className="h-3 w-3" />
              +12%
            </span>
          </div>
          <div className="text-[28px] font-bold text-[#F5F5F5]">
            {isLoading ? "..." : <AnimatedCounter value={stats?.indexed_chunks ?? 0} />}
          </div>
          <div className="mt-1 text-[12px] text-[#71717A]">Indexed Chunks</div>
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={knowledgeGrowthData}>
                <defs>
                  <linearGradient id="colorChunks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6E56CF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6E56CF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="chunks" stroke="#6E56CF" strokeWidth={2} fillOpacity={1} fill="url(#colorChunks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sources */}
        <div className="group rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5 transition-all hover:border-[#22C55E]/30 hover:shadow-lg hover:shadow-[#22C55E]/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#22C55E]/10">
              <Database className="h-5 w-5 text-[#22C55E]" />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#22C55E]">
              <TrendingUp className="h-3 w-3" />
              +2 new
            </span>
          </div>
          <div className="text-[28px] font-bold text-[#F5F5F5]">
            {isLoading ? "..." : <AnimatedCounter value={stats?.total_sources ?? 0} />}
          </div>
          <div className="mt-1 text-[12px] text-[#71717A]">Knowledge Sources</div>
          <div className="mt-3 flex flex-wrap gap-1">
            {stats?.sources_by_type &&
              Object.entries(stats.sources_by_type)
                .slice(0, 4)
                .map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-[10px] text-[#A1A1AA]"
                  >
                    {getSourceIcon(type)}
                    {count}
                  </span>
                ))}
          </div>
        </div>

        {/* Vector Database */}
        <div className="group rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5 transition-all hover:border-[#0EA5E9]/30 hover:shadow-lg hover:shadow-[#0EA5E9]/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#0EA5E9]/10">
              <Database className="h-5 w-5 text-[#0EA5E9]" />
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-medium text-[#22C55E]">
              <Activity className="h-3 w-3" />
              Connected
            </span>
          </div>
          <div className="text-[22px] font-bold text-[#F5F5F5]">Qdrant</div>
          <div className="mt-1 text-[12px] text-[#71717A]">Vector Database</div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
              <div className="h-full bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] transition-all duration-1000" style={{ width: "100%" }} />
            </div>
            <span className="text-[10px] text-[#71717A]">100%</span>
          </div>
        </div>

        {/* AI Status */}
        <div className="group rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5 transition-all hover:border-[#22C55E]/30 hover:shadow-lg hover:shadow-[#22C55E]/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#22C55E]/10">
              <Brain className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-[#22C55E] animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-[#22C55E] animate-ping opacity-75" />
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#22C55E]">Online</div>
          <div className="mt-1 text-[12px] text-[#71717A]">System Health</div>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-[#71717A]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              qwen2.5:3b
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              nomic-embed
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Two Columns */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Recent Activity + Charts */}
        <div className="space-y-4 lg:col-span-2">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#F5F5F5]">Live Activity</h3>
              <span className="flex items-center gap-1.5 text-[10px] text-[#22C55E]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Live
              </span>
            </div>
            <ActivityFeed />
          </motion.div>

          {/* Charts Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {/* Knowledge Growth */}
            <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#F5F5F5]">Knowledge Growth</h3>
                <span className="rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[10px] font-medium text-[#71717A]">
                  This Week
                </span>
              </div>
              <div className="mb-2">
                <span className="text-[24px] font-bold text-[#F5F5F5]">
                  +{knowledgeGrowthData.reduce((a, b) => a + b.chunks, 0)}
                </span>
                <span className="ml-2 text-[12px] text-[#71717A]">Chunks added</span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={knowledgeGrowthData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#71717A", fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717A", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#171A22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                      labelStyle={{ color: "#F5F5F5" }}
                      itemStyle={{ color: "#6E56CF" }}
                    />
                    <Bar dataKey="chunks" fill="#6E56CF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Content Distribution */}
            <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#F5F5F5]">Content Distribution</h3>
                <span className="text-[18px] font-bold text-[#F5F5F5]">{stats?.total_sources ?? 0}</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={contentDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {contentDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#171A22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                        labelStyle={{ color: "#F5F5F5" }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-bold text-[#F5F5F5]">{stats?.total_sources ?? 0}</span>
                    <span className="text-[9px] text-[#71717A]">Total</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {contentDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-[#A1A1AA]">{item.name}</span>
                    <span className="ml-auto text-[10px] font-medium text-[#F5F5F5]">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Background Tasks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#F5F5F5]">Background Tasks</h3>
            </div>
            <BackgroundTasks />
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#F5F5F5]">System Status</h3>
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  <div className="absolute inset-0 h-2 w-2 rounded-full bg-[#22C55E] animate-ping opacity-75" />
                </div>
                <span className="text-[10px] font-medium text-[#22C55E]">All Systems Operational</span>
              </div>
            </div>
            <LiveSystemStatus stats={stats} />
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#111318] p-5"
          >
            <div className="mb-4">
              <h3 className="text-[13px] font-semibold text-[#F5F5F5]">Quick Actions</h3>
            </div>
            <div className="space-y-1.5">
              {[
                { icon: Youtube, label: "Add YouTube Video", desc: "Extract & summarize", color: "#EF4444", href: "/youtube" },
                { icon: Instagram, label: "Add Instagram Reel", desc: "Extract captions", color: "#E1306C", href: "/instagram" },
                { icon: FileText, label: "Upload PDF", desc: "Extract and analyze", color: "#DC2626", href: "/pdf" },
                { icon: Globe, label: "Add Website", desc: "Parse web content", color: "#0EA5E9", href: "/web" },
                { icon: Mic, label: "Upload Audio", desc: "Transcribe with AI", color: "#059669", href: "/audio" },
                { icon: MessageSquare, label: "Ask AI", desc: "Chat with knowledge", color: "#6E56CF", href: "/chat" },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-[12px] p-2.5 transition-all hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px]"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon className="h-4 w-4" style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-[#F5F5F5] group-hover:text-[#6E56CF] transition-colors">
                      {action.label}
                    </div>
                    <div className="text-[9px] text-[#71717A]">{action.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#52525B] group-hover:text-[#6E56CF] group-hover:translate-x-1 transition-all" />
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
