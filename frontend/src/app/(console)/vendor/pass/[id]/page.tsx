"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/context/app-context";
import { requestsApi } from "@/lib/api";
import { ORG_NAME } from "@/lib/constants";
import { formatTimestamp } from "@/lib/format";
import type { GateRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { QrCodePlaceholder } from "@/components/ui/qr-code";
import { AttendanceBadge, StatusBadge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VendorPassPage() {
  const params = useParams<{ id: string }>();
  const passId = decodeURIComponent(params.id ?? "").trim();
  const { requests } = useApp();
  const request = requests.find((r) => r.id.toLowerCase() === passId.toLowerCase() && r.type === "vendor");
  const [fetchedRequest, setFetchedRequest] = useState<GateRequest | null>(null);
  const [fetching, setFetching] = useState(!request);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (request) {
      setFetching(false);
      return;
    }
    if (!passId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    requestsApi
      .get(passId)
      .then((apiReq) => {
        if (apiReq && apiReq.type === "vendor") {
          let extraNotes: Record<string, string> = {};
          if (apiReq.notes) {
            try {
              if (apiReq.notes.trim().startsWith("{")) {
                extraNotes = JSON.parse(apiReq.notes);
              }
            } catch {}
          }
          const mapped: GateRequest = {
            id: apiReq.id,
            type: "vendor",
            status: (apiReq.status === "cancelled" || apiReq.status === "expired" ? "rejected" : (apiReq.status as any)) ?? "pending",
            date: extraNotes.arrival_date ?? extraNotes.arrivalDate ?? (apiReq.valid_from ? apiReq.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            timeSlot: extraNotes.time_slot ?? extraNotes.timeSlot ?? (apiReq.valid_from && apiReq.valid_until ? `${apiReq.valid_from.slice(11, 16)} - ${apiReq.valid_until.slice(11, 16)}` : "—"),
            purpose: apiReq.vendor_item_description ?? extraNotes.purpose ?? "—",
            vehicle: extraNotes.vehicle_number ?? extraNotes.vehicle ?? undefined,
            createdAt: apiReq.created_at,
            requester: {
              name: extraNotes.contact_name ?? extraNotes.contactName ?? apiReq.vendor_company ?? "Vendor Contact",
              email: extraNotes.contact_email ?? extraNotes.contactEmail ?? "",
              department: extraNotes.company ?? apiReq.vendor_company ?? "—",
              hod: extraNotes.host_name ?? extraNotes.host ?? "—",
              employeeId: apiReq.requester_id || "—",
            },
            guest: {
              name: extraNotes.contact_name ?? extraNotes.contactName ?? apiReq.vendor_company ?? "Vendor",
              contact: extraNotes.contact_phone ?? extraNotes.contactPhone ?? undefined,
              company: apiReq.vendor_company ?? extraNotes.company ?? "Vendor",
            },
            review: apiReq.decided_at
              ? {
                  note: apiReq.rejection_reason ?? (typeof apiReq.notes === "string" && !apiReq.notes.startsWith("{") ? apiReq.notes : undefined),
                  by: apiReq.approver_id ? "HR Reviewer" : undefined,
                  at: apiReq.decided_at,
                }
              : undefined,
            checkInAt: undefined,
            checkOutAt: undefined,
            attendance: "scheduled",
          };
          setFetchedRequest(mapped);
        }
      })
      .catch(() => {
        setFetchedRequest(null);
      })
      .finally(() => {
        setFetching(false);
      });
  }, [passId, request]);

  const activeRequest = request || fetchedRequest;

  const search = (e: FormEvent) => {
    e.preventDefault();
    const id = query.trim();
    if (!id) return;
    router.push(`/vendor/pass/${encodeURIComponent(id)}`);
  };

  if (fetching) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-hidden />
          <p className="text-sm font-medium text-slate-700">Loading digital pass…</p>
        </CardContent>
      </Card>
    );
  }

  if (!activeRequest) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent>
          <EmptyState
            icon={<QrCode className="h-6 w-6" aria-hidden />}
            title={`Pass ${passId || "not found"} is not available`}
            description="Verify your pass ID from your receipt or schedule a new arrival."
            action={
              <div className="flex flex-col items-center gap-3">
                <form onSubmit={search} className="flex w-full max-w-xs gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter pass ID"
                    className="font-mono"
                    aria-label="Pass ID"
                  />
                  <Button type="submit" icon={<Search className="h-4 w-4" aria-hidden />}>
                    Find
                  </Button>
                </form>
                <Link href="/vendor/schedule">
                  <Button variant="outline">Schedule a new arrival</Button>
                </Link>
              </div>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const timeline = [
    { label: "Request submitted", at: activeRequest.createdAt, done: true },
    { label: "HR approval", at: activeRequest.review?.at, done: Boolean(activeRequest.review?.at), note: activeRequest.review?.note },
    {
      label: "Gate check-in",
      at: activeRequest.checkInAt,
      done: Boolean(activeRequest.checkInAt),
      note: activeRequest.status === "rejected" ? "Not applicable" : undefined,
    },
    { label: "Gate check-out", at: activeRequest.checkOutAt, done: Boolean(activeRequest.checkOutAt) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/vendor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to portal
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Printer className="h-4 w-4" aria-hidden />} onClick={() => window.print()}>
            Print pass
          </Button>
          <Link href="/vendor/schedule">
            <Button variant="outline">New arrival</Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-slate-950 px-6 py-5 text-white">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Digital vendor pass
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">{activeRequest.id}</p>
            <p className="mt-1 text-sm text-slate-300">{activeRequest.guest?.company}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={activeRequest.status} />
            {activeRequest.attendance !== "scheduled" ? <AttendanceBadge attendance={activeRequest.attendance} /> : null}
            <span className="text-xs text-slate-400">{ORG_NAME} · Gate 1</span>
          </div>
        </div>

        <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-3">
            <QrCodePlaceholder value={activeRequest.id} size={176} />
            <p className="text-center text-[11px] leading-relaxed text-slate-500">
              Show this code at the gate.
              <br />
              Scanned passes update live.
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail icon={Building2} label="Company" value={activeRequest.guest?.company ?? "—"} />
            <Detail icon={UserRound} label="Contact person" value={activeRequest.requester.name} />
            <Detail icon={Phone} label="Phone" value={activeRequest.guest?.contact ?? "—"} />
            <Detail icon={Mail} label="Email" value={activeRequest.requester.email} />
            <Detail icon={CalendarDays} label="Arrival date" value={activeRequest.date} />
            <Detail icon={Clock} label="Time slot" value={activeRequest.timeSlot} />
            <Detail icon={MapPin} label="Host" value={activeRequest.requester.hod} />
            <Detail icon={Car} label="Vehicle" value={activeRequest.vehicle ?? "Walk-in"} />
          </dl>
        </CardContent>

        <div className="border-t border-border bg-slate-50/70 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purpose of visit</p>
          <p className="mt-1 text-sm text-slate-700">{activeRequest.purpose}</p>
          {activeRequest.review?.note ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold">Reviewer note ({activeRequest.review.by}):</span> {activeRequest.review.note}
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Live status timeline"
          description="Refresh-safe — status updates as HR and security act"
          actions={<span className="text-xs text-slate-400">Submitted {formatTimestamp(activeRequest.createdAt)}</span>}
        />
        <CardContent>
          <ol className="space-y-4">
            {timeline.map((step, index) => (
              <li key={step.label} className="relative flex gap-3">
                {index < timeline.length - 1 ? (
                  <span
                    className={cn(
                      "absolute left-[7px] top-6 h-full w-px",
                      step.done && timeline[index + 1].done ? "bg-indigo-300" : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white",
                    step.done ? "bg-indigo-600" : "bg-slate-300",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium", step.done ? "text-slate-900" : "text-slate-400")}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {step.at ? formatTimestamp(step.at) : "Awaiting"}
                    {step.note ? ` · ${step.note}` : ""}
                  </p>
                </div>
                {index === 1 && activeRequest.status === "approved" ? (
                  <CheckCircle2 className="ml-auto mt-1 h-4 w-4 text-emerald-500" aria-hidden />
                ) : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</dd>
      </div>
    </div>
  );
}
