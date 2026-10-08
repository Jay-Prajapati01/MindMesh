import type { Metadata } from "next";
import { ContactPage } from "@/components/landing/ContactPage";

const TITLE = "Contact MindMesh — Talk to the team";
const DESC =
  "Questions, partnerships or account support? Send the MindMesh team a message and we'll get back to you.";

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

export default function Contact() {
  return <ContactPage />;
}
