"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listAccepted, logMovement } from "@/lib/api/gate";
import { movementLabel } from "@/lib/gate-rules";
import { EmptyState, ErrorState, TypeBadge } from "@/components/shared/badges";
import { fmt, TZ, validity, VALIDITY_CLS } from "@/lib/utils";
import type { AcceptedItem, RequestType } from "@/types/api";
const SNAP = "gate-accepted-snapshot"; const LIMIT = 50;
const who = (i: AcceptedItem) => i.visitor_name ?? i.vendor_company ?? i.requester_name ?? "—";
export default function Gate() {
  const qc = useQueryClient();
  const [type, setType] = useState<RequestType | "">(""); const [search, setSearch] = useState(""); const [q, setQ] = useState(""); const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState<AcceptedItem | null>(null); const [note, setNote] = useState("");
  useEffect(() => { const t = setTimeout(() => { setQ(search); setOffset(0); }, 300); return () => clearTimeout(t); }, [search]);
  const params = { type: type || undefined, search: q || undefined, limit: LIMIT, offset };
  const list = useQuery({ queryKey: ["gate", "accepted", params], queryFn: async () => { const d = await listAccepted(params); try { localStorage.setItem(SNAP, JSON.stringify(d)); } catch {} return d; } });
  let snapshot: AcceptedItem[] = [];
  if (list.error) { try { snapshot = JSON.parse(localStorage.getItem(SNAP) ?? "[]") as AcceptedItem[]; } catch {} }
  const items = list.data ?? snapshot;
  const log = useMutation({
    mutationFn: (i: AcceptedItem) => logMovement({ request_id: i.id, direction: i.next_movement!, notes: note.trim() || undefined }),
    onSuccess: async (_d, i) => {
      toast.success(`Logged ${i.next_movement!.toUpperCase()} — ${who(i)}`); setNote("");
      const idx = items.findIndex((x) => x.id === i.id); const fresh = await listAccepted(params);
      qc.invalidateQueries({ queryKey: ["gate"] }); setSel(fresh.find((x) => x.next_movement && x.id !== i.id) ?? fresh[Math.min(idx, fresh.length - 1)] ?? null);
    },
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="mb-3 text-2xl font-bold">Gate</h1>
        <div className="sticky top-0 mb-3 flex gap-2 bg-paper py-2">
          <input className="input" autoFocus placeholder="Search name, company, item" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input w-36" aria-label="Type" value={type} onChange={(e) => { setType(e.target.value as RequestType | ""); setOffset(0); }}><option value="">All</option><option value="leave">Leave</option><option value="visitor">Visitor</option><option value="vendor">Vendor</option></select>
        </div>
        {list.error && <ErrorState message={`${list.error.message} — showing last saved list (read-only).`} />}
        {!items.length ? <EmptyState text="No accepted passes." /> : (
          <ul className="space-y-1">{items.map((i) => (
            <li key={i.id}><button onClick={() => { log.reset(); setSel(i); }} className={`flex w-full items-center justify-between gap-2 rounded bg-white p-3 text-left focus-visible:outline-2 focus-visible:outline-ink ${sel?.id === i.id ? "ring-2 ring-signal" : ""}`}>
              <span><TypeBadge type={i.type} /> <span className="font-medium">{who(i)}</span><br /><span className="text-xs text-ink/60">Requester: {i.requester_name ?? "—"} · until {fmt(i.valid_until)}</span></span>
              <span className={`rounded px-2 py-1 text-xs font-bold ${i.next_movement ? "bg-signal text-ink" : "bg-slate-200 text-slate-600"}`}>{i.next_movement ? `Next: ${i.next_movement.toUpperCase()}` : "Completed"}</span>
            </button></li>))}</ul>)}
        <div className="mt-3 flex items-center gap-2 text-sm"><button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>Previous</button><span>Page {offset / LIMIT + 1}</span><button className="btn" disabled={(list.data?.length ?? 0) < LIMIT} onClick={() => setOffset(offset + LIMIT)}>Next</button></div>
      </section>
      <aside className="h-fit rounded bg-white p-4 lg:sticky lg:top-4" aria-live="polite">
        {!sel ? <p className="text-sm text-ink/60">Select a pass to log a movement.</p> : (<>
          <TypeBadge type={sel.type} /><h2 className="mt-2 text-lg font-bold">{who(sel)}</h2>
          <p className="text-sm">{sel.vendor_item_description ?? sel.leave_type?.replace("_", " ") ?? ""}</p>
          <p className={`mt-1 text-sm ${VALIDITY_CLS[validity(sel.valid_from, sel.valid_until)]}`}>{fmt(sel.valid_from)} → {fmt(sel.valid_until)} ({TZ()})</p>
          <label className="label mt-3" htmlFor="note">Note (optional)</label><input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          {log.error && <p role="alert" className="mt-2 text-sm text-red-700">{log.error.message}</p>}
          <button className="btn-primary mt-3 w-full justify-center py-3 text-base" disabled={!sel.next_movement || log.isPending || !!list.error} onClick={() => log.mutate(sel)}>{movementLabel(sel.next_movement)}</button>
        </>)}
      </aside>
    </div>
  );
}
