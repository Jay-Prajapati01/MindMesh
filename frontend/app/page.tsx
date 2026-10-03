import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

const TITLE = "MindMesh -> Your buddy who remembers everything you save";
const DESC =
  "Your buddy that remembers everything you save. MindMesh keeps your YouTube, PDFs, audio, Instagram, web and docs in one private, self-hosted brain you can talk to.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function Home() {
  return <LandingPage />;
}
