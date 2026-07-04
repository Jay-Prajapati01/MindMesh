import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Shell } from "@/components/Shell";
import { ThemeEffect } from "@/components/ThemeEffect";
import { NotificationBridge } from "@/components/NotificationBridge";

export const metadata: Metadata = {
  title: "MindMesh — AI Personal Knowledge OS",
  description: "AI Personal Knowledge Operating System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeEffect />
        <NotificationBridge />
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
