import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, type MouseEvent } from "react";
import { Youtube, FileText, AudioLines, Instagram, Globe, FileStack, type LucideIcon } from "lucide-react";
import { Label } from "./ui";

type F = { icon: LucideIcon; title: string; desc: string; tags: string[]; preview: string[] };
const FEATURES: F[] = [
  { icon: Youtube, title: "YouTube Intelligence", desc: "Paste a link — get transcript, summary and auto-chapters in minutes.", tags: ["Transcribe", "Summarize", "Chapterize"], preview: ["00:00 Intro", "04:12 Tokenization", "18:40 Attention", "41:12 Scaling laws"] },
  { icon: FileText, title: "PDF Intelligence", desc: "Extract → clean → chunk → embed → graph. Every page becomes queryable.", tags: ["Extract", "Chunk", "Embed"], preview: ["p.1 Abstract", "p.3 Architecture", "p.6 Training", "142 chunks indexed"] },
  { icon: AudioLines, title: "Audio Intelligence", desc: "Whisper transcription with speaker diarization for calls, notes and podcasts.", tags: ["Whisper", "Diarization", "Search"], preview: ["SPK 1 · 00:12", "SPK 2 · 00:47", "SPK 1 · 02:15", "3 speakers found"] },
  { icon: Instagram, title: "Instagram Intelligence", desc: "Reels, posts and stories — captions plus OCR on every frame you saved.", tags: ["Reels", "Captions", "OCR"], preview: ["@designmatters", "OCR: “grid first”", "Caption parsed", "12 frames read"] },
  { icon: Globe, title: "Web Intelligence", desc: "Crawl a page or a whole site and index it as clean, linked knowledge.", tags: ["Crawl", "Index", "Clip"], preview: ["paulgraham.com", "212 pages crawled", "Links resolved", "Indexed ✓"] },
  { icon: FileStack, title: "Document Intelligence", desc: "PDF, DOCX, TXT, MD, EPUB — drop the whole folder, it all connects.", tags: ["DOCX", "Markdown", "EPUB"], preview: ["notes.md", "thesis.docx", "dune.epub", "38 entities linked"] },
];

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <section id="features" className="px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col items-start gap-4">
          <Label>Features</Label>
          <h2 className="font-display uppercase leading-[0.9] text-[clamp(3rem,7vw,6.5rem)]">
            One Brain. <span className="text-orange">Every Source.</span>
          </h2>
        </div>
        <div ref={ref} className="flex flex-col gap-8 md:gap-[30vh]">
          {FEATURES.map((f, i) => (
            <Card key={f.title} f={f} i={i} n={FEATURES.length} p={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ f, i, n, p }: { f: F; i: number; n: number; p: MotionValue<number> }) {
  const last = i === n - 1;
  const a = i / n, b = (i + 1) / n;
  const scale = useTransform(p, [a, b], [1, last ? 1 : 0.94]);
  const rotate = useTransform(p, [a, b], [0, last ? 0 : -2]);
  const shade = useTransform(p, [a, b], [0, last ? 0 : 0.18]);
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 20 });
  const sry = useSpring(ry, { stiffness: 120, damping: 20 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
  };
  const I = f.icon;
  return (
    <div className="md:sticky" style={{ top: 120 + i * 14 }}>
      <motion.div
        style={{ scale, rotate }}
        initial={{ y: 60, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="origin-top [perspective:1200px]"
      >
        <motion.div
          onMouseMove={onMove}
          onMouseLeave={() => { rx.set(0); ry.set(0); }}
          style={{ rotateX: srx, rotateY: sry }}
          className={`brut relative grid gap-8 overflow-hidden p-7 md:grid-cols-2 md:p-10 ${i % 2 ? "bg-paper-card" : "bg-sheet"}`}
        >
          <motion.div style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-ink" />
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ink bg-orange"><I className="h-6 w-6" /></span>
              <span className="font-mono text-xs font-bold text-ink-muted">0{i + 1} / 0{n}</span>
            </div>
            <h3 className="mt-6 text-[32px] font-extrabold leading-tight tracking-tight">{f.title}</h3>
            <p className="mt-2 text-lg text-ink-muted">{f.desc}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              {f.tags.map((t) => (
                <span key={t} className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-xs font-bold uppercase">{t}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-paper p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold tracking-widest text-ink-muted">PREVIEW</span>
              <span className="rounded-full border-2 border-ink bg-orange px-2 font-mono text-[10px] font-bold">LIVE</span>
            </div>
            {f.preview.map((l, k) => (
              <div key={l} className="mb-2 flex items-center gap-3 rounded-xl border-2 border-ink bg-sheet px-3 py-2.5">
                <span className={`h-2.5 w-2.5 rounded-full border-2 border-ink ${k === f.preview.length - 1 ? "bg-orange" : "bg-paper-card"}`} />
                <span className="font-mono text-sm font-bold">{l}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
