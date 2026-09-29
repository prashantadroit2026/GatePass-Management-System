"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/lib/hooks/use-current-user";
import { supabase } from "@/lib/supabase/client";
import { can, creatableTypes } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/badges";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: me, error, isLoading } = useMe(); const path = usePathname(); const r = useRouter(); const qc = useQueryClient();
  if (isLoading) return <p className="p-8">Loading…</p>;
  if (error || !me) return <main className="p-8"><ErrorState message={error?.message ?? "Could not load your profile"} /><button className="btn mt-4" onClick={async () => { await supabase.auth.signOut(); qc.clear(); r.replace("/login"); }}>Sign out</button></main>;
  const nav = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/requests", label: me.role === "security" ? "Approved requests" : "Requests", show: true },
    { href: "/requests/new", label: "New request", show: creatableTypes(me.role).length > 0 },
    { href: "/gate", label: "Gate", show: can(me.role, "view_accepted_list") },
  ].filter((n) => n.show);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-ink text-white md:w-56 md:shrink-0">
        <div className="border-b-4 border-signal px-4 py-3 text-lg font-bold">Gatepass</div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col">
          {nav.map((n) => <Link key={n.href} href={n.href} className={cn("rounded px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10", path === n.href && "bg-white/15 font-semibold")}>{n.label}</Link>)}
        </nav>
        <div className="hidden p-4 text-xs text-white/70 md:block">
          <p className="font-medium text-white">{me.name}</p><p className="capitalize">{me.role}</p>
          <button className="mt-2 underline" onClick={async () => { await supabase.auth.signOut(); qc.clear(); r.replace("/login"); }}>Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
