"use client";

import { ArrowRight, Building2, CheckCircle2, Minus, Phone, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { TIME_SLOTS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { GateRequest } from "@/types";

const EMPTY = {
  guestName: "",
  contact: "",
  company: "",
  date: todayISO(),
  timeSlot: TIME_SLOTS[2],
  purpose: "",
  visitors: 1,
};

export function VisitorPassForm() {
  const { createRequest, currentUser, can } = useApp();
  const allowed = can("create_requests");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<GateRequest | null>(null);

  const set = (key: keyof typeof EMPTY, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.guestName.trim().length < 2) next.guestName = "Guest name is required";
    if (!/^[+\d][\d\s-]{7,}$/.test(form.contact.trim())) next.contact = "Enter a valid contact number";
    if (form.company.trim().length < 2) next.company = "Company is required";
    if (!form.date) next.date = "Choose a date";
    else if (form.date < todayISO()) next.date = "Date cannot be in the past";
    if (form.purpose.trim().length < 5) next.purpose = "Describe the purpose (min 5 characters)";
    if (form.visitors < 1 || form.visitors > 50) next.visitors = "Between 1 and 50 visitors";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setBusy(true);
    try {
      const request = await createRequest({
        type: "visitor",
        date: form.date,
        timeSlot: form.timeSlot,
        purpose: form.purpose.trim(),
        requester: {
          name: currentUser.name,
          email: currentUser.email,
          department: currentUser.department,
          hod: currentUser.hod,
          employeeId: currentUser.employeeId,
        },
        guest: {
          name: form.guestName.trim(),
          contact: form.contact.trim(),
          company: form.company.trim(),
          visitors: form.visitors,
        },
      });
      setCreated(request);
      setForm({ ...EMPTY, date: todayISO() });
      toast.success(`Visitor pass ${request.id} submitted`, {
        description: "You will see the live status under My Requests.",
      });
    } catch (err: unknown) {
      toast.error("Failed to submit", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Visitor pass requested</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            <span className="font-mono font-semibold text-slate-900">{created.id}</span> for {created.guest?.name} (
            {created.guest?.visitors} visitor{created.guest?.visitors === 1 ? "" : "s"}) on {created.date}.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/employee/requests">
              <Button icon={<ArrowRight className="h-4 w-4" aria-hidden />}>Track my requests</Button>
            </Link>
            <Button variant="outline" onClick={() => setCreated(null)}>
              Add another visitor
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Visitor / client gate pass"
        description="Hosted by you — the guest details appear at the security desk"
        actions={<UserPlus className="h-4 w-4 text-indigo-500" aria-hidden />}
      />
      <CardContent>
        {!allowed ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Creating requests is disabled for your role in the permission matrix.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest name" htmlFor="v-guest" required error={errors.guestName}>
              <Input id="v-guest" value={form.guestName} onChange={(e) => set("guestName", e.target.value)} placeholder="e.g. Meera Nair" />
            </Field>
            <Field label="Contact number" htmlFor="v-contact" required error={errors.contact}>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <Input id="v-contact" value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="+91 98765 43210" className="pl-9" />
              </div>
            </Field>
          </div>

          <Field label="Company / organisation" htmlFor="v-company" required error={errors.company}>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input id="v-company" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Novatech LLP" className="pl-9" />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visit date" htmlFor="v-date" required error={errors.date}>
              <Input id="v-date" type="date" value={form.date} min={todayISO()} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Time slot" htmlFor="v-slot" required>
              <Select id="v-slot" value={form.timeSlot} onChange={(e) => set("timeSlot", e.target.value)}>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Number of visitors"
            htmlFor="v-count"
            required
            error={errors.visitors}
            hint="Includes the guest named above"
          >
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                aria-label="Decrease visitor count"
                onClick={() => set("visitors", Math.max(1, form.visitors - 1))}
              >
                <Minus className="h-4 w-4" aria-hidden />
              </Button>
              <input
                id="v-count"
                type="number"
                min={1}
                max={50}
                value={form.visitors}
                onChange={(e) => set("visitors", Number(e.target.value))}
                className="field-input w-24 text-center"
              />
              <Button
                variant="outline"
                size="md"
                aria-label="Increase visitor count"
                onClick={() => set("visitors", Math.min(50, form.visitors + 1))}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </Field>

          <Field label="Purpose of visit" htmlFor="v-purpose" required error={errors.purpose}>
            <Textarea
              id="v-purpose"
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="e.g. Quarterly compliance review meeting with the Finance team"
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => { setForm({ ...EMPTY, date: todayISO() }); setErrors({}); }} disabled={busy}>
              Clear
            </Button>
            <Button type="submit" loading={busy} disabled={!allowed} icon={<UserPlus className="h-4 w-4" aria-hidden />}>
              Submit visitor pass
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
