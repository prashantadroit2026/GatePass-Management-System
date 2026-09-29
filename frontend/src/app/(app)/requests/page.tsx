"use client";
import Link from "next/link";
import { useState } from "react";
import { useRequests } from "@/lib/hooks/use-requests";
import { fmt, TZ } from "@/lib/utils";
import { EmptyState, ErrorState, StatusBadge, TypeBadge } from "@/components/shared/badges";
import { RequestActions } from "@/components/requests/request-actions";
import type { GatepassRequest, RequestStatus, RequestType } from "@/types/api";
const TABS: RequestStatus[] = ["pending", "approved", "rejected", "cancelled", "expired"];
const summary = (r: GatepassRequest) => r.type === "leave" ? `${r.leave_type?.replace("_", " ")}${r.leave_days ? ` · ${r.leave_days}d` : ""}` : r.type === "visitor" ? r.visitor_name ?? "" : `${r.vendor_company ?? "Vendor"} · ${r.vendor_item_description ?? ""}`;
export default function Requests() {
  const { data, error, isLoading } = useRequests();
  const [tab, setTab] = useState<RequestStatus>("pending"); const [type, setType] = useState<RequestType | "">(""); const [q, setQ] = useState("");
  if (error) return <ErrorState message={error.message} />;
  if (isLoading || !data) return <p>Loading…</p>;
  const rows = data.filter((r) => r.status === tab && (!type || r.type === type) && JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Requests</h1>
      <div role="tablist" className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-ink text-white" : "bg-white"}`}>{t} ({data.filter((r) => r.status === t).length})</button>)}
      </div>
      <div className="mb-4 flex gap-2">
        <input className="input max-w-xs" placeholder="Search" aria-label="Search requests" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-40" aria-label="Type" value={type} onChange={(e) => setType(e.target.value as RequestType | "")}><option value="">All types</option><option value="leave">Leave</option><option value="visitor">Visitor</option><option value="vendor">Vendor</option></select>
      </div>
      {!rows.length ? <EmptyState text={`No ${tab} requests.`} /> : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-white p-3">
              <Link href={`/requests/${r.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><TypeBadge type={r.type} /><StatusBadge status={r.status} /></div>
                <p className="mt-1 truncate font-medium">{summary(r)}</p>
                <p className="text-xs text-ink/60">Created {fmt(r.created_at)} ({TZ()})</p>
              </Link>
              <RequestActions r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
