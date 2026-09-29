"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequest } from "@/lib/hooks/use-requests";
import { listLogs } from "@/lib/api/gate";
import { RequestActions } from "@/components/requests/request-actions";
import { EmptyState, ErrorState, StatusBadge, TypeBadge } from "@/components/shared/badges";
import { fmt, TZ, validity, VALIDITY_CLS } from "@/lib/utils";
import { ApiRequestError } from "@/lib/api/client";
export default function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { data: r, error, isLoading } = useRequest(id);
  const logs = useQuery({ queryKey: ["gate", "logs", id], queryFn: () => listLogs(id), enabled: !!r });
  if (isLoading) return <p>Loading…</p>;
  if (error) return error instanceof ApiRequestError && error.code === 404 ? <EmptyState text="Request not found." /> : <ErrorState message={error.message} />;
  if (!r) return null;
  const v = validity(r.valid_from, r.valid_until);
  const fields = Object.entries({ "Leave type": r.leave_type, Days: r.leave_days, Reason: r.leave_reason, Visitor: r.visitor_name, Phone: r.visitor_phone, Purpose: r.visitor_purpose, Items: r.vendor_item_direction, Description: r.vendor_item_description, Company: r.vendor_company, Notes: r.notes, "Rejection reason": r.rejection_reason }).filter(([, x]) => x != null && x !== "");
  const events = [{ t: r.created_at, l: "Created" }, ...(r.decided_at ? [{ t: r.decided_at, l: `Decided: ${r.status}` }] : []), ...(logs.data ?? []).map((g) => ({ t: g.logged_at, l: `Gate ${g.direction.toUpperCase()}${g.notes ? ` — ${g.notes}` : ""}` }))].sort((a, b) => +new Date(a.t) - +new Date(b.t));
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><TypeBadge type={r.type} /><StatusBadge status={r.status} /></div><RequestActions r={r} /></div>
      <dl className="grid grid-cols-[9rem_1fr] gap-y-1 rounded bg-white p-4 text-sm">{fields.map(([k, x]) => <><dt key={k} className="text-ink/60">{k}</dt><dd key={k + "v"}>{String(x)}</dd></>)}</dl>
      <p className={`rounded bg-white p-4 text-sm ${VALIDITY_CLS[v]}`}>Valid {fmt(r.valid_from)} → {fmt(r.valid_until)} ({TZ()}) · {v === "soon" ? "expires within 2 hours" : v}</p>
      <ol className="space-y-2 border-l-2 border-signal pl-4">{events.map((e, i) => <li key={i} className="text-sm"><span className="font-medium">{e.l}</span><br /><span className="text-xs text-ink/60">{fmt(e.t)} ({TZ()})</span></li>)}</ol>
    </div>
  );
}
