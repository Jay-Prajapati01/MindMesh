"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Palette,
  Type,
  Zap,
  LayoutGrid,
  LogOut,
  Keyboard,
  Info,
  Moon,
  Sun,
  Monitor,
  X,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { applyThemeToDOM, applyAccentToDOM, applyDensityToDOM } from "@/components/ThemeEffect";

const ACCENT_COLORS = [
  { id: "purple" as const, color: "#6E56CF", label: "Purple" },
  { id: "blue" as const, color: "#3B82F6", label: "Blue" },
  { id: "green" as const, color: "#22C55E", label: "Green" },
  { id: "rose" as const, color: "#F43F5E", label: "Rose" },
];

export function SettingsDropdown() {
  const open = useAppStore((s) => s.settingsDropdownOpen);
  const setOpen = useAppStore((s) => s.setSettingsDropdownOpen);
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const ref = useRef<HTMLDivElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#111318] text-[#A1A1AA] transition-all hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]"
      >
        <Settings className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-[260px] overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#111318] shadow-2xl shadow-black/50"
          >
            <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
              <h3 className="text-[12px] font-semibold text-[#F5F5F5]">Settings</h3>
            </div>

            <div className="p-2">
              {/* Theme */}
              <div className="mb-1 px-2 py-1.5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  <Palette className="h-3 w-3" />
                  Theme
                </div>
                <div className="flex gap-1.5">
                  {[
                    { id: "dark" as const, icon: Moon, label: "Dark" },
                    { id: "light" as const, icon: Sun, label: "Light" },
                    { id: "system" as const, icon: Monitor, label: "System" },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => { setSettings({ theme: theme.id }); applyThemeToDOM(theme.id); }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-medium transition-all ${
                        settings.theme === theme.id
                          ? "bg-[#6E56CF] text-white"
                          : "bg-[rgba(255,255,255,0.04)] text-[#71717A] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#A1A1AA]"
                      }`}
                    >
                      <theme.icon className="h-3 w-3" />
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="mb-1 px-2 py-1.5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  Accent Color
                </div>
                <div className="flex gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSettings({ accentColor: c.id }); applyAccentToDOM(c.id); }}
                      className={`h-6 w-6 rounded-full transition-all ${
                        settings.accentColor === c.id
                          ? "ring-2 ring-offset-2 ring-offset-[#111318]"
                          : "hover:scale-110"
                      }`}
                      style={{
                        backgroundColor: c.color,
                        ["--tw-ring-color" as string]: settings.accentColor === c.id ? c.color : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Density */}
              <div className="mb-1 px-2 py-1.5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  <LayoutGrid className="h-3 w-3" />
                  Density
                </div>
                <div className="flex gap-1.5">
                  {(["comfortable", "compact"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => { setSettings({ density: d }); applyDensityToDOM(d); }}
                      className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium capitalize transition-all ${
                        settings.density === d
                          ? "bg-[#6E56CF] text-white"
                          : "bg-[rgba(255,255,255,0.04)] text-[#71717A] hover:bg-[rgba(255,255,255,0.08)]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animations */}
              <div className="mb-1 px-2 py-1.5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#52525B]">
                  <Zap className="h-3 w-3" />
                  Animations
                </div>
                <div className="flex gap-1.5">
                  {(["enabled", "reduced"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setSettings({ animations: a })}
                      className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium capitalize transition-all ${
                        settings.animations === a
                          ? "bg-[#6E56CF] text-white"
                          : "bg-[rgba(255,255,255,0.04)] text-[#71717A] hover:bg-[rgba(255,255,255,0.08)]"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.06)] p-2">
              <button
                onClick={() => { setShowShortcuts(true); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#A1A1AA]"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Keyboard Shortcuts
              </button>
              <button
                onClick={() => { setShowAbout(true); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-[#71717A] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#A1A1AA]"
              >
                <Info className="h-3.5 w-3.5" />
                About MindMesh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={() => setShowShortcuts(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[420px] overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111318] shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-5 py-4">
                <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Keyboard Shortcuts</h3>
                <button onClick={() => setShowShortcuts(false)} className="text-[#71717A] hover:text-[#F5F5F5]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { keys: ["Ctrl", "K"], desc: "Open Command Palette" },
                  { keys: ["Esc"], desc: "Close dialogs & modals" },
                  { keys: ["↑", "↓"], desc: "Navigate in Command Palette" },
                  { keys: ["Enter"], desc: "Select item in Command Palette" },
                  { keys: ["Ctrl", "K"], desc: "Focus search on Chat/Search pages" },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#A1A1AA]">{shortcut.desc}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <span key={j}>
                          <kbd className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-2 py-1 text-[11px] font-medium text-[#F5F5F5]">
                            {key}
                          </kbd>
                          {j < shortcut.keys.length - 1 && <span className="mx-1 text-[#52525B]">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About MindMesh Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={() => setShowAbout(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[400px] overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#111318] shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-5 py-4">
                <h3 className="text-[14px] font-semibold text-[#F5F5F5]">About MindMesh</h3>
                <button onClick={() => setShowAbout(false)} className="text-[#71717A] hover:text-[#F5F5F5]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6E56CF]/10">
                  <Settings className="h-7 w-7 text-[#6E56CF]" />
                </div>
                <h4 className="text-[18px] font-bold text-[#F5F5F5]">MindMesh</h4>
                <p className="mt-1 text-[11px] text-[#71717A]">Version 0.1.0</p>
                <p className="mt-3 text-[12px] leading-relaxed text-[#A1A1AA]">
                  Your personal AI Knowledge Operating System.
                  Ingest, search, and chat with your knowledge from YouTube, Instagram, PDFs, documents, audio, and websites.
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-[#71717A]">
                  <span>Built with Next.js + FastAPI</span>
                  <span>•</span>
                  <span>Qdrant + Ollama</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
