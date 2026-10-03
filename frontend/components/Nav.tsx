"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
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
  { href: "/dashboard", label: "Dashboard", icon: Home },
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
    <aside className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r-2 border-ink bg-card text-foreground p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Link
          href="/"
          onClick={onNavigate}
          title="Back to landing page"
          className="flex items-center gap-2 rounded-lg"
        >
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border-2 border-ink bg-[#111]">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-full w-full object-contain p-1" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-foreground">MindMesh</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle className="rounded-lg border-2 border-transparent p-1.5 text-foreground-3 transition-colors hover:border-ink hover:bg-surface hover:text-foreground" />
        </div>
      </div>
      <nav className="space-y-1.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                active
                  ? "brut-btn bg-brand text-ink font-extrabold"
                  : "border-2 border-transparent text-foreground-3 hover:border-ink hover:bg-surface hover:text-foreground"
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
