"use client";

import { LogIn, LogOut, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { REQUEST_TYPE_META } from "@/lib/constants";
import { formatClock, formatDate } from "@/lib/format";
import { AttendanceBadge, TypeBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GateRequest } from "@/types";

export function GateCard({ request }: { request: GateRequest }) {
  const { recordGateMovement, can } = useApp();
  const allowed = can("gate_check_in_out");
  const onPremises = request.attendance === "on_premises";
  const departed = request.attendance === "departed";

  const move = (kind: "check_in" | "check_out") => {
    recordGateMovement(request.id, kind);
    toast.success(`${kind === "check_in" ? "Check-in" : "Check-out"} recorded`, {
      description: `${request.id} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    });
  };

  return (
    <article
      className={cn(
        "rounded-2xl border-2 bg-white p-5 shadow-sm transition",
        departed ? "border-slate-200 opacity-80" : onPremises ? "border-emerald-300" : "border-slate-300",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold text-slate-900">{request.id}</span>
            <TypeBadge type={request.type} />
          </div>
          <p className="mt-1.5 truncate text-lg font-semibold text-slate-900">
            {request.guest?.name ?? request.requester.name}
          </p>
          <p className="truncate text-sm text-slate-600">
            {request.guest?.company ?? request.requester.department}
            {request.requester.name !== (request.guest?.name ?? "") && request.type !== "employee"
              ? ` · host: ${request.requester.name}`
              : ""}
          </p>
        </div>
        <AttendanceBadge attendance={request.attendance} className="text-xs" />
      </div>

      <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          <span className="text-slate-400">Slot:</span> <span className="font-medium">{request.timeSlot}</span>
          {request.expectedReturn ? <span className="text-slate-500"> · return by {request.expectedReturn}</span> : null}
        </p>
        <p className="truncate">
          <span className="text-slate-400">Vehicle:</span>{" "}
          <span className="font-mono font-medium">{request.vehicle ?? "—"}</span>
        </p>
        <p className="sm:col-span-2 truncate">
          <span className="text-slate-400">Purpose:</span> <span className="font-medium">{request.purpose}</span>
        </p>
        <p>
          <span className="text-slate-400">In:</span>{" "}
          <span className="font-semibold tabular-nums">{formatClock(request.checkInAt)}</span>
        </p>
        <p>
          <span className="text-slate-400">Out:</span>{" "}
          <span className="font-semibold tabular-nums">{formatClock(request.checkOutAt)}</span>
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!allowed || onPremises || departed}
          onClick={() => move("check_in")}
          title={!allowed ? "Disabled in the permission matrix" : onPremises ? "Already on premises" : undefined}
          className="kiosk-btn bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
        >
          <LogIn className="h-5 w-5" aria-hidden />
          Check In
        </button>
        <button
          type="button"
          disabled={!allowed || !onPremises}
          onClick={() => move("check_out")}
          title={!allowed ? "Disabled in the permission matrix" : !onPremises ? "Not on premises yet" : undefined}
          className="kiosk-btn bg-slate-900 text-white shadow-sm hover:bg-slate-800"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Check Out
        </button>
      </div>

      {!allowed ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700">
          <PauseCircle className="h-3.5 w-3.5" aria-hidden />
          Gate actions are disabled in the permission matrix.
        </p>
      ) : departed ? (
        <p className="mt-3 text-xs font-medium text-slate-500">
          Departure recorded at {formatClock(request.checkOutAt)} on {formatDate(request.date)}.
        </p>
      ) : null}
    </article>
  );
}

export function gateTypeLabel(type: GateRequest["type"]): string {
  return REQUEST_TYPE_META[type].label;
}
