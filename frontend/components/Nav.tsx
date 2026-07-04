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
    <aside className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-white/10 p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Brain className="h-6 w-6 text-brand" />
        <span className="text-lg font-semibold">MindMesh</span>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-brand text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
