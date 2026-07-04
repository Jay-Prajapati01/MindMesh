"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const ACCENT_COLORS: Record<string, { brand: string; hover: string }> = {
  purple: { brand: "#6E56CF", hover: "#7C69E3" },
  blue: { brand: "#3B82F6", hover: "#60A5FA" },
  green: { brand: "#22C55E", hover: "#4ADE80" },
  rose: { brand: "#F43F5E", hover: "#FB7185" },
};

export function applyThemeToDOM(theme: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

export function applyAccentToDOM(accentColor: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.purple;
  root.style.setProperty("--brand", colors.brand);
  root.style.setProperty("--brand-hover", colors.hover);
}

export function applyDensityToDOM(density: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (density === "compact") {
    root.classList.add("compact-density");
  } else {
    root.classList.remove("compact-density");
  }
}

export function ThemeEffect() {
  const theme = useAppStore((s) => s.settings.theme);
  const accentColor = useAppStore((s) => s.settings.accentColor);
  const density = useAppStore((s) => s.settings.density);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  useEffect(() => {
    applyAccentToDOM(accentColor);
  }, [accentColor]);

  useEffect(() => {
    applyDensityToDOM(density);
  }, [density]);

  return null;
}
