"use client";

import { Check, Eye, Pause, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { REQUEST_TYPE_META } from "@/lib/constants";
import { subjectName } from "@/lib/requests";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import type { GateRequest, RequestStatus } from "@/types";

type Action = Exclude<RequestStatus, "pending">;

const ACTIONS: Record<
  Action,
  {
    label: string;
    variant: ButtonVariant;
    icon: typeof Check;
    title: string;
    description: string;
    placeholder: string;
    toast: "success" | "warning" | "error";
    result: string;
  }
> = {
  approved: {
    label: "Approve",
    variant: "success",
    icon: Check,
    title: "Approve request",
    description: "The pass moves to the security gate queue immediately.",
    placeholder: "Optional note for the requester and the gate (e.g. approved by HR)…",
    toast: "success",
    result: "approved",
  },
  hold: {
    label: "Hold",
    variant: "warning",
    icon: Pause,
    title: "Place request on hold",
    description: "The request stays in the queue until you revisit it.",
    placeholder: "What needs to be resolved before approval? (optional)",
    toast: "warning",
    result: "placed on hold",
  },
  rejected: {
    label: "Reject",
    variant: "danger",
    icon: X,
    title: "Reject request",
    description: "The requester is notified with your note.",
    placeholder: "Reason for rejection (recommended)…",
    toast: "error",
    result: "rejected",
  },
};

export function RequestReviewActions({
  request,
  size = "sm",
  compact = false,
}: {
  request: GateRequest;
  size?: ButtonSize;
  compact?: boolean;
}) {
  const { reviewRequest, can } = useApp();
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = can("approve_requests");

  if (request.status !== "pending") {
    return <StatusBadge status={request.status} />;
  }

  const open = (next: Action) => {
    setNote("");
    setAction(next);
  };

  const confirm = () => {
    if (!action) return;
    setBusy(true);
    const target = action;
    window.setTimeout(() => {
      reviewRequest(request.id, target, note);
      setBusy(false);
      setAction(null);
      toast[ACTIONS[target].toast](`${request.id} ${ACTIONS[target].result}`, {
        description: note.trim()
          ? `Note: ${note.trim()}`
          : `${REQUEST_TYPE_META[request.type].label} · ${request.date}`,
      });
    }, 420);
  };

  const meta = action ? ACTIONS[action] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="success"
          size={size}
          loading={busy}
          disabled={!allowed}
          title={allowed ? "Approve request" : "Disabled in the permission matrix"}
          icon={<Check className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => open("approved")}
        >
          {compact ? null : "Approve"}
        </Button>
        <Button
          variant="warning"
          size={size}
          disabled={!allowed}
          title={allowed ? "Place on hold" : "Disabled in the permission matrix"}
          icon={<Pause className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => open("hold")}
        >
          {compact ? null : "Hold"}
        </Button>
        <Button
          variant="danger"
          size={size}
          disabled={!allowed}
          title={allowed ? "Reject request" : "Disabled in the permission matrix"}
          icon={<X className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => open("rejected")}
        >
          {compact ? null : "Reject"}
        </Button>
      </div>

      <Modal
        open={action !== null}
        onClose={() => (busy ? undefined : setAction(null))}
        title={meta?.title ?? ""}
        description={meta?.description}
        footer={
          <>
            <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant={meta?.variant ?? "primary"} loading={busy} onClick={confirm}>
              {`Confirm ${meta?.label.toLowerCase() ?? ""}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold text-slate-900">{request.id}</span>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              {subjectName(request)} · {REQUEST_TYPE_META[request.type].label}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {request.purpose} — {request.date} · {request.timeSlot}
            </p>
          </div>
          <label className="block">
            <span className="field-label">Reviewer note (optional)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={meta?.placeholder}
              disabled={busy}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}

export function RequestDetailButton({ request }: { request: GateRequest }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={<Eye className="h-3.5 w-3.5" aria-hidden />}
        onClick={() => setOpen(true)}
      >
        Details
      </Button>
      <RequestDetailModal request={request} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function RequestDetailModal({
  request,
  open,
  onClose,
}: {
  request: GateRequest;
  open: boolean;
  onClose: () => void;
}) {
  const steps = [
    { label: "Submitted", at: request.createdAt, done: true },
    { label: "HR review", at: request.review?.at, done: Boolean(request.review?.at) },
    { label: "Gate check-in", at: request.checkInAt, done: Boolean(request.checkInAt) },
    { label: "Gate check-out", at: request.checkOutAt, done: Boolean(request.checkOutAt) },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request ${request.id}`}
      description={REQUEST_TYPE_META[request.type].label}
      size="lg"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Requester" value={request.requester.name} />
          <Detail label="Employee ID" value={request.requester.employeeId} />
          <Detail label="Department" value={request.requester.department} />
          <Detail label="HOD" value={request.requester.hod} />
          <Detail label="Scheduled date" value={request.date} />
          <Detail label="Time slot" value={request.timeSlot} />
          {request.expectedReturn ? <Detail label="Expected return" value={request.expectedReturn} /> : null}
          {request.vehicle ? <Detail label="Vehicle" value={request.vehicle} /> : null}
          {request.guest ? <Detail label="Guest / company" value={request.guest.name} /> : null}
          {request.guest?.contact ? <Detail label="Contact" value={request.guest.contact} /> : null}
          {request.guest?.visitors ? <Detail label="Visitors" value={String(request.guest.visitors)} /> : null}
        </div>

        <div>
          <p className="field-label">Purpose</p>
          <p className="rounded-xl border border-border bg-slate-50 p-3 text-sm text-slate-700">
            {request.purpose}
          </p>
        </div>

        {request.review?.note ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Reviewer note · {request.review.by}
            </p>
            <p className="mt-1 text-sm text-amber-900">{request.review.note}</p>
          </div>
        ) : null}

        <div>
          <p className="field-label">Timeline</p>
          <ol className="space-y-3">
            {steps.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${step.done ? "bg-indigo-500" : "bg-slate-300"}`}
                  aria-hidden
                />
                <div>
                  <p className={`text-sm font-medium ${step.done ? "text-slate-900" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {step.at ? new Date(step.at).toLocaleString() : "Awaiting"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
