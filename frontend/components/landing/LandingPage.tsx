"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { IntroReveal } from "./IntroReveal";
import { Hero } from "./Hero";
import { Manifesto } from "./Manifesto";
import { Features } from "./Features";
import { Navbar, Marquee, ProblemSolution, HowItWorks, Bento, Stats, FinalCTA, Footer } from "./Sections";

export function LandingPage() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1 });
    let id = 0;
    const raf = (t: number) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    let t = 0;
    const onHold = (e: Event) => {
      lenis.stop();
      const html = document.documentElement;
      html.style.overflow = "hidden";
      clearTimeout(t);
      t = window.setTimeout(() => { html.style.overflow = ""; lenis.start(); }, (e as CustomEvent<number>).detail ?? 2000);
    };
    window.addEventListener("mindmesh:intro-hold", onHold);
    return () => { cancelAnimationFrame(id); clearTimeout(t); window.removeEventListener("mindmesh:intro-hold", onHold); document.documentElement.style.overflow = ""; lenis.destroy(); };
  }, []);

  return (
    <div className="paper-grain min-h-screen overflow-x-clip text-ink">
      <IntroReveal>
        <Navbar />
        <main>
          <Hero />
          <Marquee />
          <Manifesto />
          <ProblemSolution />
          <Features />
          <HowItWorks />
          <Bento />
          <Stats />
          <FinalCTA />
        </main>
        <Footer />
      </IntroReveal>
    </div>
  );
}
