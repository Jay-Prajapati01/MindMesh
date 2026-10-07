"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cloudMode } from "@/lib/auth";
import { getSupabase } from "@/lib/supabaseClient";

export function CloudAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cache = useQueryClient();
  const [ready, setReady] = useState(!cloudMode);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cloudMode) return;
    try {
      const auth = getSupabase().auth;
      auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setReady(true); });
      const { data } = auth.onAuthStateChange((event, session) => {
        const previousUser = localStorage.getItem("mindmesh-session-owner");
        if (session && previousUser !== session.user.id) {
          cache.clear();
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("mindmesh")) localStorage.removeItem(key);
          }
          sessionStorage.removeItem("mindmesh-chat-id");
          localStorage.setItem("mindmesh-session-owner", session.user.id);
          window.location.reload(); return;
        }
        setSignedIn(!!session);
        setReady(true);
        if (event === "SIGNED_OUT") {
          cache.clear();
          sessionStorage.removeItem("mindmesh-chat-id");
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith("mindmesh")) localStorage.removeItem(key);
          }
          // Clear in-memory process/chat state as well as cached query results.
          window.location.assign("/");
        }
      });
      return () => data.subscription.unsubscribe();
    } catch {
      setMessage("Sign-in configuration is missing. Contact the workspace administrator.");
      setReady(true);
    }
  }, [cache]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) setMessage("Unable to sign in. Check your email and password.");
    } catch { setMessage("Sign-in is temporarily unavailable."); }
    finally { setBusy(false); }
  }

  if (!cloudMode || pathname === "/" || pathname === "/contact") return <>{children}</>;
  if (!ready) return <p className="p-8">Loading your session…</p>;
  if (signedIn) return <><div className="flex justify-end px-6 py-2"><button onClick={() => getSupabase().auth.signOut()}>Sign out</button></div>{children}</>;
  return <main className="mx-auto max-w-md p-8">
    <h1 className="mb-6 text-2xl font-semibold">Sign in to MindMesh</h1>
    <form onSubmit={signIn} className="space-y-4">
      <label className="block">Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded border p-2 text-black" /></label>
      <label className="block">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded border p-2 text-black" /></label>
      <button disabled={busy} className="rounded bg-orange-600 px-4 py-2 text-white">{busy ? "Signing in…" : "Sign in"}</button>
      {message && <p role="alert">{message}</p>}
    </form>
  </main>;
}
