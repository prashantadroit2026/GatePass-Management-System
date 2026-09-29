"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRequest } from "@/lib/api/requests";
import { useMe } from "@/lib/hooks/use-current-user";
import { creatableTypes } from "@/lib/permissions";
import { ErrorState } from "@/components/shared/badges";
import type { RequestType } from "@/types/api";

const num = z.preprocess((v) => (v === "" || Number.isNaN(v) ? undefined : v), z.number().int().min(1).optional());
const S = {
  leave: z.object({ leave_type: z.enum(["outing", "full_leave"]), leave_days: num, leave_reason: z.string().optional(), notes: z.string().optional() }),
  visitor: z.object({ visitor_name: z.string().min(1), visitor_phone: z.string().min(5), visitor_purpose: z.string().optional(), notes: z.string().optional() }),
  vendor: z.object({ vendor_item_direction: z.enum(["in", "out"]), vendor_item_description: z.string().min(1), vendor_company: z.string().optional(), notes: z.string().optional() }),
} as const;
const F: Record<RequestType, [string, string, "text" | "number" | "select", string[]?][]> = {
  leave: [["leave_type", "Leave type", "select", ["outing", "full_leave"]], ["leave_days", "Days (blank = 24 hours)", "number"], ["leave_reason", "Reason", "text"], ["notes", "Notes", "text"]],
  visitor: [["visitor_name", "Visitor name", "text"], ["visitor_phone", "Visitor phone", "text"], ["visitor_purpose", "Purpose", "text"], ["notes", "Notes", "text"]],
  vendor: [["vendor_item_direction", "Items", "select", ["in", "out"]], ["vendor_item_description", "Item description", "text"], ["vendor_company", "Company", "text"], ["notes", "Notes", "text"]],
};
export default function NewTyped({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params) as { type: RequestType }; const { data: me } = useMe(); const r = useRouter(); const qc = useQueryClient();
  const form = useForm<Record<string, unknown>>({ resolver: zodResolver(S[type] ?? S.leave) });
  const m = useMutation({ mutationFn: (b: unknown) => createRequest(type, b), onSuccess: (d) => { toast.success("Request submitted"); qc.invalidateQueries({ queryKey: ["requests"] }); r.push(`/requests/${d.id}`); }, onError: (e) => toast.error(e.message) });
  if (!me) return null;
  if (!F[type] || !creatableTypes(me.role).includes(type)) return <ErrorState message="Your role cannot create this request type." />;
  return (
    <form onSubmit={form.handleSubmit((v) => m.mutate(Object.fromEntries(Object.entries(v).filter(([, x]) => x !== "" && x !== undefined))))} className="grid max-w-3xl gap-4 md:grid-cols-[1fr_16rem]">
      <div className="space-y-3 rounded bg-white p-5">
        <h1 className="text-2xl font-bold capitalize">{type} request</h1>
        {F[type].map(([k, l, t, opts]) => (
          <div key={k}><label className="label" htmlFor={k}>{l}</label>
            {t === "select" ? <select id={k} className="input" {...form.register(k)}>{opts!.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}</select>
              : <input id={k} type={t} className="input" {...form.register(k, t === "number" ? { setValueAs: (v) => (v === "" ? undefined : Number(v)) } : {})} />}
            {form.formState.errors[k] && <p className="text-xs text-red-700">Check this field</p>}
          </div>
        ))}
        <button className="btn-primary" disabled={m.isPending}>Submit request</button>
      </div>
      <aside className="rounded border-l-4 border-signal bg-white p-4 text-sm">
        <p className="font-semibold">Validity</p>
        <p className="mt-1 text-ink/70">Set by the server on creation: {type === "leave" ? "now to now + leave days (24 hours if blank)" : "now to now + 24 hours"}. The request starts as pending.</p>
      </aside>
    </form>
  );
}
