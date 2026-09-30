"use client";

import { ArrowRight, CalendarCheck, CheckCircle2, KeyRound, QrCode, Search, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

const STEPS = [
  {
    icon: Truck,
    title: "Company & contact",
    description: "Who is visiting and how the gate can reach them.",
  },
  {
    icon: CalendarCheck,
    title: "Date, slot & host",
    description: "Pick the arrival window and the employee hosting you.",
  },
  {
    icon: ShieldCheck,
    title: "Vehicle & purpose",
    description: "Registration number and the reason for the visit.",
  },
];

export default function VendorPortalPage() {
  const router = useRouter();
  const [passId, setPassId] = useState("");

  const retrieve = (e: FormEvent) => {
    e.preventDefault();
    const id = passId.trim().toUpperCase();
    if (!id) {
      toast.error("Enter a pass ID");
      return;
    }
    router.push(`/vendor/pass/${encodeURIComponent(id)}`);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-slate-800 bg-slate-950 text-white shadow-lg">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
            Public vendor self-service
          </p>
          <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Schedule your arrival at Acme Industries — no account, no email threads
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            Three short steps generate a digital pass with a QR code. Show it at Gate 1 and security checks you in with
            a live timestamp.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/vendor/schedule">
              <Button size="lg" className="w-full sm:w-auto" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                Schedule an arrival
              </Button>
            </Link>
            <a href="#retrieve">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 sm:w-auto"
                icon={<QrCode className="h-4 w-4" aria-hidden />}
              >
                View my pass
              </Button>
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="How it works" description="End-to-end, from request to gate movement" />
          <CardContent>
            <ol className="grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="rounded-xl border border-border bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Icon className="h-4.5 w-4.5" aria-hidden />
                      </span>
                      <span className="text-xs font-semibold text-slate-400">STEP {index + 1}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: CheckCircle2, text: "HR approves before the gate sees you" },
                { icon: QrCode, text: "Digital pass with QR + live status" },
                { icon: KeyRound, text: "Check-in and check-out timestamps" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-2 text-xs text-slate-600">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  {item.text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div id="retrieve" className="scroll-mt-28">
          <Card>
            <CardHeader title="Retrieve a pass" description="Enter the pass ID from your receipt" />
          <CardContent>
            <form onSubmit={retrieve} className="space-y-4">
              <Field label="Pass ID" htmlFor="retrieve-id" hint="Example: VND-2026-8891">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    id="retrieve-id"
                    value={passId}
                    onChange={(e) => setPassId(e.target.value)}
                    placeholder="VND-2026-0000"
                    className="pl-9 font-mono uppercase"
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                Open pass
              </Button>
              <p className="text-xs leading-relaxed text-slate-500">
                The receipt shows live status: pending → approved → on premises → departed.
              </p>
            </form>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
