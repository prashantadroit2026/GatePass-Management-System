"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { decide, type DecisionMode } from "@/lib/api/requests";
import { canCancel, canDecide } from "@/lib/permissions";
import { useMe } from "@/lib/hooks/use-current-user";
import { useRoleMap } from "@/lib/hooks/use-requests";
import type { GatepassRequest } from "@/types/api";

function Dialog({ mode, busy, error, onConfirm, onClose }: { mode: DecisionMode; busy: boolean; error?: string; onConfirm: (t: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const [t, setT] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(28rem,92vw)] rounded-lg p-5 backdrop:bg-black/50">
      <h2 className="mb-3 text-lg font-semibold capitalize">{mode} request</h2>
      <label className="label" htmlFor="why">{mode === "reject" ? "Reason (required)" : "Notes (optional)"}</label>
      <textarea id="why" value={t} onChange={(e) => setT(e.target.value)} rows={3} className="input" />
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>Back</button>
        <button className="btn-primary" disabled={busy || (mode === "reject" && !t.trim())} onClick={() => onConfirm(t.trim())}>Confirm {mode}</button>
      </div>
    </dialog>
  );
}

export function RequestActions({ r }: { r: GatepassRequest }) {
  const { data: me } = useMe(); const roles = useRoleMap(me?.role); const qc = useQueryClient();
  const [mode, setMode] = useState<DecisionMode | null>(null);
  const m = useMutation({
    mutationFn: (v: { mode: DecisionMode; text: string }) => decide(r.id, v.mode, v.text),
    onSuccess: (_d, v) => { toast.success(`Request ${v.mode === "approve" ? "approved" : v.mode === "reject" ? "rejected" : "cancelled"}`); setMode(null); ["requests", "request", "notifications"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
  if (!me) return null;
  const btns: [DecisionMode, string, string][] = [];
  if (canDecide(me, r, roles)) btns.push(["approve", "Approve", "btn-primary"], ["reject", "Reject", "btn-danger"]);
  if (canCancel(me, r)) btns.push(["cancel", "Cancel", "btn"]);
  if (!btns.length) return null;
  return (
    <div className="flex gap-2">
      {btns.map(([k, l, c]) => <button key={k} className={c} onClick={() => { m.reset(); setMode(k); }}>{l}</button>)}
      {mode && <Dialog mode={mode} busy={m.isPending} error={m.error?.message} onClose={() => setMode(null)} onConfirm={(text) => m.mutate({ mode, text })} />}
    </div>
  );
}
