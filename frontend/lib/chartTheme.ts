export interface ChartTheme {
  background: string;
  text: string;
  mutedText: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  brand: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export function getChartTheme(resolvedTheme: "dark" | "light" | string): ChartTheme {
  const isDark = resolvedTheme !== "light";

  if (isDark) {
    return {
      background: "#111318",
      text: "#F5F5F5",
      mutedText: "#71717A",
      grid: "rgba(255, 255, 255, 0.08)",
      tooltipBackground: "#171A22",
      tooltipBorder: "rgba(255, 255, 255, 0.12)",
      tooltipText: "#F5F5F5",
      brand: "#6E56CF",
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#EF4444",
      info: "#38BDF8",
    };
  }

  return {
    background: "#FFFFFF",
    text: "#111827",
    mutedText: "#8A93A3",
    grid: "rgba(15, 23, 42, 0.08)",
    tooltipBackground: "#FFFFFF",
    tooltipBorder: "rgba(15, 23, 42, 0.12)",
    tooltipText: "#111827",
    brand: "#6046C8",
    success: "#168A4A",
    warning: "#B96A00",
    danger: "#C62828",
    info: "#087EA4",
  };
}
