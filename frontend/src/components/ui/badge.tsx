import type { ReactNode } from "react";
import { REQUEST_TYPE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Attendance, RequestStatus, RequestType } from "@/types";

export type BadgeTone = "slate" | "indigo" | "emerald" | "amber" | "rose" | "sky";

const TONES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({
  tone = "slate",
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

const STATUS_META: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  hold: { label: "On Hold", tone: "amber" },
  rejected: { label: "Rejected", tone: "rose" },
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} className={className} dot>
      {meta.label}
    </Badge>
  );
}

const ATTENDANCE_META: Record<Attendance, { label: string; tone: BadgeTone }> = {
  scheduled: { label: "Scheduled", tone: "sky" },
  on_premises: { label: "On Premises", tone: "emerald" },
  departed: { label: "Departed", tone: "slate" },
};

export function AttendanceBadge({
  attendance,
  className,
}: {
  attendance: Attendance;
  className?: string;
}) {
  const meta = ATTENDANCE_META[attendance];
  return (
    <Badge tone={meta.tone} className={className} dot>
      {meta.label}
    </Badge>
  );
}

const TYPE_TONES: Record<RequestType, BadgeTone> = {
  employee: "indigo",
  visitor: "sky",
  vendor: "slate",
};

export function TypeBadge({ type, className }: { type: RequestType; className?: string }) {
  return <Badge tone={TYPE_TONES[type]} className={className}>{REQUEST_TYPE_META[type].short}</Badge>;
}
