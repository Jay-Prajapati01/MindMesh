"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, KeyRound, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { getPlans, previewPromo, redeemPromo, type Plan } from "@/lib/commerce";
import { useAuth } from "@/components/CloudAuthGate";
import { Footer, Navbar } from "@/components/landing/Sections";

const labels: Record<string, string> = {
  youtube: "YouTube videos", instagram: "Instagram reels", pdf: "PDFs",
  documents: "Documents", audio: "Audio files", web: "Web pages",
  search: "Searches", chat: "Ask AI messages",
};

export default function PricingPage() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ allowed_plans: string[]; campaign_name: string; duration_hours: number } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPlans().then((data) => setPlans(data.plans)).catch(() => setMessage("Pricing is temporarily unavailable."));
  }, []);

  async function apply(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      setMessage("Sign in before applying a promo code.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      setPreview(await previewPromo(code));
    } catch (error: any) {
      setPreview(null);
      setMessage(error?.response?.data?.detail?.message || "That promo code could not be applied.");
    } finally {
      setBusy(false);
    }
  }

  async function redeem(plan: string) {
    setBusy(true);
    try {
      const result: any = await redeemPromo(code, plan);
      setMessage(`Promo applied. Your effective plan is ${result.effective_plan}.`);
      setPreview(null);
    } catch (error: any) {
      setMessage(error?.response?.data?.detail?.message || "Promo redemption failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper-grain flex min-h-screen flex-col overflow-x-clip bg-paper text-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link href="/" className="mb-7 flex w-fit items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink-muted transition-colors hover:text-orange sm:mb-9">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <header className="mb-8 text-center sm:mb-10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-brand sm:text-xs sm:tracking-widest">
          Plans for every knowledge habit
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Choose your workspace.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
          Every plan includes a private account, secure sync with the MindMesh companion, and the option to use your own AI keys.
        </p>
        <div className="mx-auto mt-6 grid max-w-3xl gap-2 text-left sm:grid-cols-3">
          <Benefit icon={<ShieldCheck />} title="Private by default" text="Your workspace stays personal." />
          <Benefit icon={<Smartphone />} title="Companion ready" text="Your saves stay in sync." />
          <Benefit icon={<KeyRound />} title="Use your own keys" text="Choose managed AI or BYOK." />
        </div>
        </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => <PlanCard key={plan.key} plan={plan} />)}
      </div>

      <section className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border-2 border-ink bg-card p-4 shadow-card sm:mt-10 sm:p-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-1 h-5 w-5 shrink-0 text-brand" />
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">Have a promo code?</h2>
            <p className="text-sm text-muted">Promos add temporary plan access. They never grant account administration.</p>
          </div>
        </div>
        <form onSubmit={apply} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input aria-label="Promo code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter promo code" className="min-w-0 w-full flex-1 rounded-xl border-2 border-ink bg-surface px-4 py-3 font-mono uppercase" />
          <button disabled={busy} className="brut-btn w-full rounded-xl bg-orange px-5 py-3 font-bold disabled:opacity-50 sm:w-auto">{busy ? "Checking…" : "Apply"}</button>
        </form>
        {preview && (
          <div className="mt-5 rounded-xl border-2 border-ink bg-surface p-4">
            <p className="font-bold">{preview.campaign_name} gives {preview.duration_hours} hours of access. Choose your plan:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.allowed_plans.map((plan) => <button key={plan} disabled={busy} onClick={() => redeem(plan)} className="brut-btn rounded-lg bg-card px-4 py-2 font-bold capitalize">Use {plan}</button>)}
            </div>
          </div>
        )}
        {message && <p role="status" className="mt-4 text-sm font-semibold">{message}</p>}
      </section>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
        Online checkout is introduced only after payment verification is configured. <Link href="/plans/ai-providers" className="font-bold underline">Configure BYOK</Link> anytime.
      </p>
      </main>
      <Footer />
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card px-3 py-3 shadow-[3px_3px_0_var(--ink)]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="min-w-0"><b className="block text-sm">{title}</b><span className="block truncate text-xs text-muted">{text}</span></span>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const highlighted = plan.key === "pro";
  return (
    <article className={`relative flex min-h-full flex-col rounded-3xl border-2 border-ink p-5 shadow-card sm:p-6 ${highlighted ? "bg-ink text-paper md:col-span-2 xl:col-span-1" : "bg-card"}`}>
      {highlighted && <span className="absolute -top-3 right-5 rounded-full border-2 border-ink bg-orange px-3 py-1 text-xs font-black text-ink">MOST CAPABLE</span>}
      <h2 className="text-2xl font-extrabold">{plan.name}</h2>
      <p className="mt-2 text-4xl font-black">{plan.price_paise ? `₹${plan.price_paise / 100}` : "₹0"}<span className="text-sm font-normal"> / month</span></p>
      <ul className="mt-6 space-y-2.5 sm:space-y-3">
        {Object.entries(plan.limits).map(([key, value]) => <li key={key} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-brand" /><span><b>{value}</b> {labels[key]}</span></li>)}
      </ul>
      <Link href={plan.key === "free" ? "/signup" : "/pricing"} className={`brut-btn mt-auto block rounded-xl px-4 py-3 text-center font-bold ${highlighted ? "bg-orange text-ink" : "bg-surface text-ink"}`}>
        {plan.key === "free" ? "Start free" : "View upgrade options"} <Sparkles className="inline h-4 w-4" />
      </Link>
    </article>
  );
}
