"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Nav } from "./Nav";
import { ActiveProcessesBanner } from "./ActiveProcessesBanner";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPalette } from "./dashboard/CommandPalette";
import { useAppStore } from "@/lib/store";
import { applyThemeToDOM, applyAccentToDOM, applyDensityToDOM } from "./ThemeEffect";
import { markIntroSeen } from "@/lib/intro";

const CHROMELESS_ROUTES = ["/", "/contact", "/login", "/signup", "/forgot-password", "/reset-password"];

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const settings = useAppStore((s) => s.settings);
  const pathname = usePathname();

  // Apply theme on mount (fixes hydration mismatch issue)
  useEffect(() => {
    applyThemeToDOM(settings.theme);
    applyAccentToDOM(settings.accentColor);
    applyDensityToDOM(settings.density);
  }, [settings.theme, settings.accentColor, settings.density]);

  // Landing + contact pages render without the app sidebar/chrome
  if (CHROMELESS_ROUTES.includes(pathname)) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="paper-grain flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Nav />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-56 border-r-2 border-ink bg-card shadow-brut-lg">
            <Nav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b-2 border-ink bg-card px-4 py-3 md:hidden">
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" className="text-foreground">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link
            href="/"
            onClick={markIntroSeen}
            className="text-lg font-extrabold tracking-tight text-foreground"
          >
            MindMesh
          </Link>
          <div className="ml-auto">
            <ThemeToggle className="-mr-2 rounded-lg p-1.5 text-foreground-3 transition-colors hover:bg-surface hover:text-foreground" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>

      {/* Global command palette (Ctrl+K) — available on every app page */}
      <CommandPalette />

      {/* Global active processes banner — shows on ALL pages */}
      <ActiveProcessesBanner />
    </div>
  );
}
