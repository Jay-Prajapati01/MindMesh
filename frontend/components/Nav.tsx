"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Home,
  Search,
  MessageSquare,
  Youtube,
  Instagram,
  FileText,
  Files,
  Mic,
  Globe,
  Network,
  Clock,
  GitCompare,
  LayoutGrid,
  Library,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/workspace", label: "Workspace", icon: LayoutGrid },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/instagram", label: "Instagram", icon: Instagram },
  { href: "/pdf", label: "PDF", icon: FileText },
  { href: "/documents", label: "Documents", icon: Files },
  { href: "/audio", label: "Audio", icon: Mic },
  { href: "/web", label: "Web", icon: Globe },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Ask AI", icon: MessageSquare },
  { href: "/stored", label: "Stored", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-card text-foreground p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Brain className="h-6 w-6 text-brand" />
        <span className="text-lg font-semibold text-foreground">MindMesh</span>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand text-white font-medium shadow-sm"
                  : "text-foreground-3 hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex justify-end px-2 pt-4 border-t border-border/50">
        <ThemeToggle className="rounded-lg p-2 text-foreground-3 transition-colors hover:bg-surface hover:text-foreground" />
      </div>
    </aside>
  );
}
