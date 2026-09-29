"use client";
import Link from "next/link";
import { useMe } from "@/lib/hooks/use-current-user";
import { useRequests, useRoleMap } from "@/lib/hooks/use-requests";
import { canDecide } from "@/lib/permissions";
import { validity } from "@/lib/utils";
import { ErrorState } from "@/components/shared/badges";
export default function Dashboard() {
  const { data: me } = useMe(); const { data, error } = useRequests(); const roles = useRoleMap(me?.role);
  if (error) return <ErrorState message={error.message} />;
  if (!me || !data) return <p>Loading…</p>;
  const pending = data.filter((r) => r.status === "pending");
  const cards: [string, number][] =
    me.role === "security" ? [["Approved passes", data.length], ["Valid now", data.filter((r) => validity(r.valid_from, r.valid_until) === "ok" || validity(r.valid_from, r.valid_until) === "soon").length]]
    : me.role === "hr" || me.role === "admin" ? [["Awaiting your decision", data.filter((r) => canDecide(me, r, roles)).length], ["Pending > 4h", pending.filter((r) => Date.now() - new Date(r.created_at).getTime() > 4 * 3600e3).length], ...(["approved", "rejected", "cancelled", "expired"] as const).map((s): [string, number] => [s[0].toUpperCase() + s.slice(1), data.filter((r) => r.status === s).length])]
    : [["My pending", pending.length], ["Approved and valid now", data.filter((r) => r.status === "approved" && validity(r.valid_from, r.valid_until) !== "expired").length]];
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Hello, {me.name}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([l, n]) => <div key={l} className="border-l-4 border-signal bg-white p-4"><p className="text-3xl font-bold">{n}</p><p className="text-sm text-ink/70">{l}</p></div>)}</div>
      <Link href="/requests" className="btn mt-6">Open requests</Link>
    </div>
  );
}
