"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Nav } from "./Nav";
import { ActiveProcessesBanner } from "./ActiveProcessesBanner";
import { useAppStore } from "@/lib/store";
import { applyThemeToDOM, applyAccentToDOM, applyDensityToDOM } from "./ThemeEffect";

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const settings = useAppStore((s) => s.settings);

  // Apply theme on mount (fixes hydration mismatch issue)
  useEffect(() => {
    applyThemeToDOM(settings.theme);
    applyAccentToDOM(settings.accentColor);
    applyDensityToDOM(settings.density);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Nav />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full bg-[#0b0b12]">
            <Nav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-white/10 p-4 md:hidden">
          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold">MindMesh</span>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>

      {/* Global active processes banner — shows on ALL pages */}
      <ActiveProcessesBanner />
    </div>
  );
}
