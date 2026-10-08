import { motion, useScroll, useSpring } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, MessageSquare, Network, Clock, GitCompare, Globe, Activity, Unlink, BrainCircuit, Zap, MoveRight } from "lucide-react";
import { Btn, FadeUp, Label } from "./ui";
import { MiniGraph } from "./Hero";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../CloudAuthGate";

function useIdentity() {
  const { session } = useAuth();
  const meta = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.preferred_name === "string" && meta.preferred_name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    session?.user.email?.split("@")[0] ||
    "Your profile";
  const initials =
    displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "M";
  return { session, displayName: displayName.trim(), initials };
}

export function Marquee() {
  const t = "YOUTUBE • PDF • AUDIO • INSTAGRAM • WEB • DOCS • GRAPH RAG • CHAT • ";
  return (
    <div className="overflow-hidden border-y-2 border-ink bg-orange">
      <div className="overflow-hidden border-b-2 border-ink py-2.5 md:py-3">
        <div className="animate-marquee flex w-max items-center whitespace-nowrap">
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="font-display pr-10 text-2xl uppercase leading-none text-ink md:text-3xl">{t}</span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden bg-paper-card py-2.5 md:py-3">
        <div className="animate-marquee-reverse flex w-max items-center whitespace-nowrap">
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="font-display pr-10 text-2xl uppercase leading-none text-ink md:text-3xl">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProblemSolution() {
  const cards = [
    { n: "01", tag: "CHAOS", icon: Unlink, t: "The Problem", d: "Your knowledge is scattered across tabs, bookmarks, reels, voice notes and PDFs you'll never find again.", bg: "bg-sheet", iconBg: "bg-paper-card" },
    { n: "02", tag: "MINDMESH", icon: BrainCircuit, t: "The MindMesh Way", d: "Ingest anything. Ask in plain English. Get answers with citations pointing to the exact second, page or frame.", bg: "bg-orange", iconBg: "bg-sheet" },
    { n: "03", tag: "CLARITY", icon: Zap, t: "The Result", d: "A private second brain with a living knowledge graph and a timeline of everything you've learned.", bg: "bg-paper-card", iconBg: "bg-orange" },
  ];
  return (
    <section className="px-4 pb-10 pt-20 sm:pb-14 sm:pt-24">
      <div className="mx-auto mb-10 grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <Label>From noise to knowledge</Label>
          <h2 className="font-display mt-4 max-w-4xl uppercase leading-[0.92] text-[clamp(2.8rem,6vw,5.7rem)]">One flow. <span className="text-orange">Zero hunting.</span></h2>
        </div>
        <MoveRight className="hidden h-12 w-12 shrink-0 text-orange sm:block" strokeWidth={2.5} />
      </div>
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <FadeUp key={c.t} delay={i * 0.1}>
            <motion.article
              whileHover={{ y: -8, rotate: i === 0 ? -1 : i === 2 ? 1 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`process-card brut relative flex min-h-[330px] h-full flex-col overflow-hidden p-6 sm:p-7 ${c.bg}`}
            >
              <div className="absolute -right-3 -top-7 font-display text-[8rem] leading-none text-ink/10" aria-hidden="true">{c.n}</div>
              <div className="relative flex items-start justify-between gap-4">
                <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-ink shadow-[3px_3px_0_var(--ink)] ${c.iconBg}`}>
                  <c.icon className="h-8 w-8" strokeWidth={2.4} />
                </span>
                <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-[10px] font-bold tracking-widest">{c.tag}</span>
              </div>
              <div className="relative mt-auto pt-12">
                <span className="font-mono text-xs font-bold text-ink-muted">STEP / {c.n}</span>
                <h3 className="mt-2 text-2xl font-extrabold sm:text-3xl">{c.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink">{c.d}</p>
              </div>
              <div className="absolute bottom-0 left-0 h-2 w-full border-t-2 border-ink bg-orange" />
            </motion.article>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const steps = [
    ["01", "CAPTURE", "Drop any link or file."],
    ["02", "UNDERSTAND", "Chunk + embed in Qdrant."],
    ["03", "CONNECT", "GraphRAG entities + relations."],
    ["04", "ASK", "Hybrid search + cited answers."],
  ];
  return (
    <section id="how" className="scroll-mt-24 border-y-2 border-ink bg-paper-alt px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <Label>How it works</Label>
        <h2 className="font-display mt-4 uppercase leading-[0.9] text-[clamp(3rem,7vw,6.5rem)]">
          Four steps to <span className="text-orange">total recall.</span>
        </h2>
        <div ref={ref} className="relative mt-16">
          <div className="absolute left-0 right-0 top-8 hidden h-[6px] rounded-full border-2 border-ink bg-sheet md:block">
            <motion.div style={{ scaleX: fill }} className="h-full origin-left rounded-full bg-orange" />
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map(([n, t, d]) => (
              <div key={n} className="relative">
                <span className="brut font-display relative z-10 grid h-16 w-16 place-items-center rounded-2xl bg-orange text-2xl">{n}</span>
                <h3 className="font-display mt-6 text-3xl uppercase">{t}</h3>
                <p className="mt-2 text-ink-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <FadeUp className="mt-16">
          <div className="brut flex flex-col items-start justify-between gap-4 bg-ink p-5 md:flex-row md:items-center md:p-6">
            <div><p className="font-mono text-xs font-bold uppercase tracking-widest text-orange">Ready when you are</p><p className="mt-1 text-lg font-bold text-paper md:text-xl">Create your account and start building your personal knowledge workspace.</p></div>
            <Link href="/signup" className="brut-btn shrink-0 bg-orange px-4 py-2 text-sm font-bold">Create account <ArrowRight className="inline h-4 w-4" /></Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

export function Bento() {
  return (
    <section id="graph" className="scroll-mt-24 px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <Label>Showcase</Label>
        <h2 className="font-display mt-4 mb-14 uppercase leading-[0.9] text-[clamp(3rem,7vw,6.5rem)]">
          Built like a <span className="text-orange">real OS.</span>
        </h2>
        <div className="grid auto-rows-[260px] gap-6 md:grid-cols-3">
          <FadeUp className="md:col-span-2 md:row-span-2">
            <Tile icon={MessageSquare} title="Unified AI Chat" desc="Persistent threads, citations, confidence." className="bg-sheet">
              <div className="mt-4 space-y-3">
                <div className="ml-auto w-fit rounded-2xl border-2 border-ink bg-paper-card px-4 py-2 font-semibold">Compare the two papers on RAG?</div>
                <div className="max-w-md rounded-2xl border-2 border-ink bg-paper p-4">
                  Paper A favors dense retrieval <b className="text-orange">[1]</b>; Paper B shows sparse + graph fusion wins on multi-hop <b className="text-orange">[2]</b>.
                </div>
                <span className="inline-block rounded-full border-2 border-ink bg-orange px-3 py-1 font-mono text-xs font-bold">94% CONFIDENCE</span>
              </div>
            </Tile>
          </FadeUp>
          <FadeUp delay={0.1}><Tile icon={Network} title="Knowledge Graph" desc="Entities & relations, live." className="bg-paper-card"><MiniGraph className="mx-auto h-28 w-full" /></Tile></FadeUp>
          <FadeUp delay={0.2}>
            <Tile icon={Clock} title="Memory Timeline" desc="Everything, in order." className="bg-paper-alt">
              <div className="mt-3 space-y-2">
                {["Saved reel", "Read PDF", "Watched talk"].map((x, i) => (
                  <div key={x} className="flex items-center gap-2 text-sm font-semibold"><span className={`h-3 w-3 rounded-full border-2 border-ink ${i ? "bg-sheet" : "bg-orange"}`} />{x}</div>
                ))}
              </div>
            </Tile>
          </FadeUp>
          <FadeUp delay={0.1}>
            <Tile icon={GitCompare} title="Cross-Source Compare" desc="Video vs. paper vs. notes." className="bg-orange">
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs font-bold">
                <span className="rounded-lg border-2 border-ink bg-sheet p-2">YT: agrees</span>
                <span className="rounded-lg border-2 border-ink bg-sheet p-2">PDF: differs</span>
              </div>
            </Tile>
          </FadeUp>
          <FadeUp delay={0.2}>
            <Tile icon={Globe} title="Save Web Pages" desc="Paste a link to add a page to your knowledge." className="bg-sheet">
              <span className="brut-btn mt-4 inline-flex items-center gap-2 bg-orange px-4 py-2 text-sm font-bold"><Globe className="h-4 w-4" />Save to MindMesh</span>
            </Tile>
          </FadeUp>
          <FadeUp delay={0.3}>
            <Tile icon={Activity} title="Realtime Progress" desc="SSE-streamed pipeline status." className="bg-paper-card">
              <div className="mt-4 h-5 overflow-hidden rounded-full border-2 border-ink bg-sheet">
                <motion.div initial={{ width: "0%" }} whileInView={{ width: "72%" }} viewport={{ once: true }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} className="h-full bg-orange" />
              </div>
              <p className="mt-2 font-mono text-xs font-bold">EMBEDDING · 72%</p>
            </Tile>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function Tile({ icon: I, title, desc, className, children }: { icon: typeof Clock; title: string; desc: string; className: string; children?: React.ReactNode }) {
  return (
    <div className={`brut lift flex h-full flex-col overflow-hidden p-6 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-sheet"><I className="h-5 w-5" /></span>
        <div><h3 className="text-lg font-extrabold leading-tight">{title}</h3><p className="text-sm text-ink-muted">{desc}</p></div>
      </div>
      {children}
    </div>
  );
}

export function Stats() {
  const rows = [
    ["01", "Your Workspace", "Your sources and conversations stay with your account."],
    ["02", "Connected Ideas", "Find connections across the knowledge you save."],
    ["03", "Grounded Answers", "Ask questions and follow citations back to your sources."],
  ];
  return (
    <section id="your-workspace" className="scroll-mt-24 px-4 py-28">
      <div className="mx-auto max-w-6xl border-b-2 border-ink">
        {rows.map(([n, t, d]) => (
          <div key={t} className="group relative overflow-hidden border-t-2 border-ink">
            <div className="absolute inset-0 origin-bottom scale-y-0 bg-orange transition-transform duration-500 [transition-timing-function:var(--ease-brut)] group-hover:scale-y-100" />
            <div className="relative flex flex-col gap-2 py-8 md:flex-row md:items-center md:gap-10">
              <span className="font-display text-orange text-[clamp(3.5rem,8vw,7rem)] leading-none transition-colors group-hover:text-ink">{n}</span>
              <span className="font-display text-[clamp(2rem,5vw,4.5rem)] uppercase leading-none">{t}</span>
              <span className="max-w-xs text-base font-semibold md:ml-auto md:text-right">{d}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="border-t-2 border-ink bg-paper-alt px-4 py-32 text-center">
      <FadeUp>
        <h2 className="font-display mx-auto max-w-5xl uppercase leading-[0.9] tracking-[-0.03em] text-[clamp(3.5rem,9vw,8.5rem)]">
          Stop searching. <span className="text-orange text-stroke">Start asking.</span>
        </h2>
        <div className="mt-10"><Btn href="/signup">Create Your Account <ArrowRight className="h-4 w-4" /></Btn></div>
        <p className="mt-6 font-mono text-sm font-bold text-ink-muted">Your sources. Your ideas. One personal workspace.</p>
      </FadeUp>
    </section>
  );
}

export function Footer() {
  const { session } = useAuth();
  return (
    <footer className="border-t-2 border-ink px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <Logo />
        <div className="flex items-center gap-6 text-sm font-bold">
          {session ? (
            <Link href="/profile" className="hover:text-orange">Profile</Link>
          ) : (
            <Link href="/login" className="hover:text-orange">Sign in</Link>
          )}
          <Link href="/contact" className="hover:text-orange">Contact</Link>
          <span className="text-ink-muted">© {new Date().getFullYear()} MindMesh</span>
        </div>
      </div>
    </footer>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-[#111]">
        <Image src="/logo.png" alt="" width={36} height={36} className="h-full w-full object-contain p-1" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">MindMesh</span>
    </Link>
  );
}

export function Navbar() {
  const { session, displayName, initials } = useIdentity();
  return (
    <header className="sticky top-0 z-50 h-16 border-b-2 border-ink bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-bold lg:flex">
          {[["Features", "/#features"], ["How it works", "/#how"], ["Graph", "/#graph"], ["Your Workspace", "/#your-workspace"]].map(([l, h]) => (
            <a key={l} href={h} className="hover:text-orange">{l}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <Link href="/dashboard" className="hidden text-sm font-bold hover:text-orange sm:block">Open workspace</Link>
              <Link
                href="/profile"
                title="Your profile"
                className="brut-btn flex items-center gap-2 rounded-xl bg-paper px-2.5 py-1.5 text-sm font-bold"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-ink bg-orange text-[10px] font-extrabold">{initials}</span>
                <span className="hidden max-w-36 truncate sm:inline">{displayName}</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-bold hover:text-orange">Sign in</Link>
              <Link href="/signup" className="brut-btn rounded-xl bg-orange px-3 py-2 text-sm font-bold hover:bg-orange-hover">Get Started</Link>
            </>
          )}
          <ContactWithPass />
        </div>
      </div>
    </header>
  );
}

const LanyardPass = lazy(() => import("./LanyardPass"));

function ContactWithPass() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const u = () => setShow(mq.matches);
    u(); mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const onContact = pathname === "/contact";
  const contact = useCallback(() => { router.push("/contact"); }, [router]);
  return (
    <div className="relative">
      <Link href="/contact" className="brut-btn relative z-10 flex items-center rounded-xl bg-paper px-3 py-2 text-sm font-bold">Contact</Link>
      {show && !onContact && <Suspense fallback={null}><LanyardPass onTap={contact} /></Suspense>}
    </div>
  );
}
