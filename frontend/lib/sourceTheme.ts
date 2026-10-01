import {
  Youtube,
  Instagram,
  FileText,
  Files,
  Mic,
  Globe,
  Database,
  type LucideIcon,
} from "lucide-react";

export type SourceType = "youtube" | "instagram" | "pdf" | "document" | "audio" | "web" | string;

export interface SourceTheme {
  name: string;
  accent: string;
  softDark: string;
  softLight: string;
  borderDark: string;
  borderLight: string;
  icon: LucideIcon;
}

export const SOURCE_THEMES: Record<string, SourceTheme> = {
  youtube: {
    name: "YouTube",
    accent: "#FF0000",
    softDark: "rgba(255, 0, 0, 0.14)",
    softLight: "rgba(255, 0, 0, 0.08)",
    borderDark: "rgba(255, 0, 0, 0.30)",
    borderLight: "rgba(255, 0, 0, 0.22)",
    icon: Youtube,
  },
  instagram: {
    name: "Instagram",
    accent: "#E1306C",
    softDark: "rgba(225, 48, 108, 0.14)",
    softLight: "rgba(225, 48, 108, 0.08)",
    borderDark: "rgba(225, 48, 108, 0.30)",
    borderLight: "rgba(225, 48, 108, 0.22)",
    icon: Instagram,
  },
  pdf: {
    name: "PDF",
    accent: "#DC2626",
    softDark: "rgba(220, 38, 38, 0.14)",
    softLight: "rgba(220, 38, 38, 0.08)",
    borderDark: "rgba(220, 38, 38, 0.30)",
    borderLight: "rgba(220, 38, 38, 0.22)",
    icon: FileText,
  },
  document: {
    name: "Document",
    accent: "#7C3AED",
    softDark: "rgba(124, 58, 237, 0.14)",
    softLight: "rgba(124, 58, 237, 0.08)",
    borderDark: "rgba(124, 58, 237, 0.30)",
    borderLight: "rgba(124, 58, 237, 0.22)",
    icon: Files,
  },
  audio: {
    name: "Audio",
    accent: "#059669",
    softDark: "rgba(5, 150, 105, 0.14)",
    softLight: "rgba(5, 150, 105, 0.08)",
    borderDark: "rgba(5, 150, 105, 0.30)",
    borderLight: "rgba(5, 150, 105, 0.22)",
    icon: Mic,
  },
  web: {
    name: "Web",
    accent: "#0EA5E9",
    softDark: "rgba(14, 165, 233, 0.14)",
    softLight: "rgba(14, 165, 233, 0.08)",
    borderDark: "rgba(14, 165, 233, 0.30)",
    borderLight: "rgba(14, 165, 233, 0.22)",
    icon: Globe,
  },
};

export function getSourceTheme(type: SourceType): SourceTheme {
  const normalized = (type || "").toLowerCase();
  return SOURCE_THEMES[normalized] || {
    name: type || "Source",
    accent: "var(--brand)",
    softDark: "var(--brand-soft)",
    softLight: "var(--brand-soft)",
    borderDark: "var(--border)",
    borderLight: "var(--border)",
    icon: Database,
  };
}

export function getSourceBadgeStyle(type: SourceType, isDark: boolean = true) {
  const theme = getSourceTheme(type);
  return {
    color: theme.accent,
    backgroundColor: isDark ? theme.softDark : theme.softLight,
    borderColor: isDark ? theme.borderDark : theme.borderLight,
  };
}
