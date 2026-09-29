"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Login() {
  const r = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const queryError = searchParams.get("error");
    if (queryError) {
      setErr(queryError);
    }
  }, [searchParams]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) return setErr(error.message);
    r.replace("/dashboard"); r.refresh();
  }
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border-t-8 border-signal bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Gatepass</h1>
        <p className="mb-5 text-sm text-ink/70">Sign in with the account HR created for you.</p>
        <label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input mb-3" />
        <label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required className="input" />
        {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
        <button disabled={busy} className="btn-primary mt-5 w-full justify-center">Sign in</button>
      </form>
    </main>
  );
}

