"use client";

import { ArrowLeft, ArrowRight, Building2, CalendarDays, Car, Mail, Phone, Send, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { REQUEST_TYPE_META, TIME_SLOTS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";

const STEP_LABELS = [
  { label: "Company & contact", description: "Who is visiting" },
  { label: "Date, slot & host", description: "When and with whom" },
  { label: "Vehicle & purpose", description: "Gate details" },
];

interface FormState {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  date: string;
  timeSlot: string;
  host: string;
  vehicle: string;
  purpose: string;
}

const EMPTY: FormState = {
  company: "",
  contactName: "",
  email: "",
  phone: "",
  date: todayISO(),
  timeSlot: TIME_SLOTS[2],
  host: "",
  vehicle: "",
  purpose: "",
};

export function VendorScheduleForm() {
  const router = useRouter();
  const { createRequest, users } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const hosts = useMemo(() => users.map((u) => `${u.name} — ${u.department}`), [users]);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (form.company.trim().length < 2) next.company = "Company name is required";
      if (form.contactName.trim().length < 2) next.contactName = "Contact person is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email";
      if (!/^[+\d][\d\s-]{7,}$/.test(form.phone.trim())) next.phone = "Enter a valid phone number";
    }
    if (index === 1) {
      if (!form.date) next.date = "Choose an arrival date";
      else if (form.date < todayISO()) next.date = "Date cannot be in the past";
      if (!form.timeSlot) next.timeSlot = "Choose a time slot";
      if (form.host.trim().length < 2) next.host = "Select the employee hosting you";
    }
    if (index === 2) {
      if (form.purpose.trim().length < 5) next.purpose = "Describe the purpose (min 5 characters)";
      if (form.vehicle && !/^[A-Za-z0-9\s-]{6,12}$/.test(form.vehicle.trim()))
        next.vehicle = "Use plate format, e.g. KA-05-JR-4412";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) toast.error("Please fix the highlighted fields");
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!validateStep(2)) return;
    setBusy(true);
    try {
      const request = await createRequest({
        type: "vendor",
        date: form.date,
        timeSlot: form.timeSlot,
        purpose: form.purpose.trim(),
        vehicle: form.vehicle.trim() || undefined,
        requester: {
          name: form.contactName.trim(),
          email: form.email.trim().toLowerCase(),
          department: form.company.trim(),
          hod: form.host.trim(),
          employeeId: "—",
        },
        guest: {
          name: form.company.trim(),
          contact: form.phone.trim(),
          company: form.company.trim(),
        },
      });
      toast.success(`Pass ${request.id} created`, { description: "Showing your digital pass receipt." });
      router.push(`/vendor/pass/${encodeURIComponent(request.id)}`);
    } catch (err: unknown) {
      toast.error("Failed to schedule arrival", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader
        title="Schedule an arrival"
        description="All fields are required unless marked optional"
        actions={<span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{REQUEST_TYPE_META.vendor.label}</span>}
      />
      <CardContent className="space-y-6">
        <Stepper steps={STEP_LABELS} current={step} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-5"
          noValidate
        >
          {step === 0 ? (
            <>
              <Field label="Company name" htmlFor="vd-company" required error={errors.company}>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input id="vd-company" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Sterling Facilities Pvt Ltd" className="pl-9" />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact person" htmlFor="vd-name" required error={errors.contactName}>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <Input id="vd-name" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="e.g. Rahul Verma" className="pl-9" />
                  </div>
                </Field>
                <Field label="Phone number" htmlFor="vd-phone" required error={errors.phone}>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <Input id="vd-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98450 22113" className="pl-9" />
                  </div>
                </Field>
              </div>
              <Field label="Work email" htmlFor="vd-email" required error={errors.email}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input id="vd-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" className="pl-9" />
                </div>
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Arrival date" htmlFor="vd-date" required error={errors.date}>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <Input id="vd-date" type="date" value={form.date} min={todayISO()} onChange={(e) => set("date", e.target.value)} className="pl-9" />
                  </div>
                </Field>
                <Field label="Time slot" htmlFor="vd-slot" required error={errors.timeSlot}>
                  <Select id="vd-slot" value={form.timeSlot} onChange={(e) => set("timeSlot", e.target.value)}>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Host employee" htmlFor="vd-host" required error={errors.host} hint="Start typing to pick an Adroit X Signet employee">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    id="vd-host"
                    list="vd-hosts"
                    value={form.host}
                    onChange={(e) => set("host", e.target.value)}
                    placeholder="e.g. Ananya Sharma — Engineering"
                    className="pl-9"
                  />
                  <datalist id="vd-hosts">
                    {hosts.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Vehicle registration (optional)" htmlFor="vd-vehicle" error={errors.vehicle} hint="Leave blank if you are arriving without a vehicle">
                <div className="relative">
                  <Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input id="vd-vehicle" value={form.vehicle} onChange={(e) => set("vehicle", e.target.value)} placeholder="KA-05-JR-4412" className="pl-9 font-mono uppercase" />
                </div>
              </Field>
              <Field label="Purpose of visit" htmlFor="vd-purpose" required error={errors.purpose}>
                <Textarea
                  id="vd-purpose"
                  value={form.purpose}
                  onChange={(e) => set("purpose", e.target.value)}
                  placeholder="e.g. HVAC quarterly maintenance on floors 2-4"
                />
              </Field>

              <div className="rounded-xl border border-border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Review</p>
                <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <Summary label="Company" value={form.company} />
                  <Summary label="Contact" value={`${form.contactName} · ${form.phone}`} />
                  <Summary label="Arrival" value={`${form.date} · ${form.timeSlot}`} />
                  <Summary label="Host" value={form.host} />
                  <Summary label="Vehicle" value={form.vehicle || "Walk-in"} />
                </dl>
              </div>
            </>
          ) : null}
        </form>
      </CardContent>

      <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={goBack} disabled={step === 0 || busy}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>
        {step < STEP_LABELS.length - 1 ? (
          <Button onClick={goNext}>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button loading={busy} onClick={submit} icon={<Send className="h-4 w-4" aria-hidden />}>
            Generate digital pass
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500">{label}:</dt>
      <dd className="min-w-0 truncate font-medium text-slate-800">{value || "—"}</dd>
    </div>
  );
}
