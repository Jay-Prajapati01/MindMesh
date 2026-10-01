export interface GraphTheme {
  canvas: string;
  background: string;
  grid: string;
  controlBackground: string;
  controlForeground: string;
  minimapBackground: string;
  minimapMask: string;
  nodeText: string;
  nodeBackground: string;
  nodeBorder: string;
  edge: string;
  edgeLabel: string;
  edgeLabelBackground: string;
  panelBackground: string;
  panelBorder: string;
}

export function getGraphTheme(resolvedTheme: "dark" | "light" | string): GraphTheme {
  const isDark = resolvedTheme !== "light";

  if (isDark) {
    return {
      canvas: "#09090B",
      background: "#09090B",
      grid: "#1D2028",
      controlBackground: "#111318",
      controlForeground: "#D4D4D8",
      minimapBackground: "#111318",
      minimapMask: "rgba(9, 9, 11, 0.75)",
      nodeText: "#F5F5F5",
      nodeBackground: "#111318",
      nodeBorder: "rgba(255, 255, 255, 0.12)",
      edge: "rgba(255, 255, 255, 0.20)",
      edgeLabel: "#A1A1AA",
      edgeLabelBackground: "#171A22",
      panelBackground: "#111318",
      panelBorder: "rgba(255, 255, 255, 0.08)",
    };
  }

  return {
    canvas: "#F6F7F9",
    background: "#F6F7F9",
    grid: "#E7EAF0",
    controlBackground: "#FFFFFF",
    controlForeground: "#374151",
    minimapBackground: "#FFFFFF",
    minimapMask: "rgba(246, 247, 249, 0.75)",
    nodeText: "#111827",
    nodeBackground: "#FFFFFF",
    nodeBorder: "rgba(15, 23, 42, 0.12)",
    edge: "rgba(15, 23, 42, 0.22)",
    edgeLabel: "#6B7280",
    edgeLabelBackground: "#F0F2F5",
    panelBackground: "#FFFFFF",
    panelBorder: "rgba(15, 23, 42, 0.10)",
  };
}
