"use client";

import { DoorOpen, LogIn, LogOut, ScanLine, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/context/app-context";
import { todayISO } from "@/lib/format";
import { subjectName } from "@/lib/requests";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { useClock, useSimulatedLoad } from "@/hooks/use-app";
import { ActivityLog } from "@/components/security/activity-log";
import { GateCard } from "@/components/security/gate-card";
import { format } from "date-fns";
import type { GateRequest, RequestType } from "@/types";

type Filter = "all" | RequestType;

const ORDER: Record<GateRequest["attendance"], number> = { scheduled: 0, on_premises: 1, departed: 2 };

export default function GateOperationsPage() {
  const { requests, currentUser } = useApp();
  const now = useClock();
  const loading = useSimulatedLoad(500);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const today = todayISO();

  const approvedToday = useMemo(
    () => requests.filter((r) => r.status === "approved" && r.date === today),
    [requests, today],
  );

  const queue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return approvedToday
      .filter((r) => filter === "all" || r.type === filter)
      .filter((r) =>
        !q
          ? true
          : [r.id, subjectName(r), r.requester.name, r.guest?.company ?? "", r.vehicle ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q),
      )
      .sort((a, b) => ORDER[a.attendance] - ORDER[b.attendance]);
  }, [approvedToday, filter, query]);

  const awaiting = approvedToday.filter((r) => r.attendance === "scheduled").length;
  const onPremises = approvedToday.filter((r) => r.attendance === "on_premises").length;
  const departed = approvedToday.filter((r) => r.attendance === "departed").length;

  return (
    <div className="space-y-5">
      {/* Kiosk status band */}
      <section className="rounded-2xl bg-slate-950 px-5 py-5 text-white shadow-lg sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">
              <ScanLine className="h-4 w-4" aria-hidden />
              Gate operations · Gate 1
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Welcome back, {currentUser.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {format(now, "EEEE, dd MMMM yyyy")} · showing HR-approved passes for today only
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{format(now, "HH:mm:ss")}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">Live clock</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Approved today", value: approvedToday.length, tone: "text-indigo-300" },
            { label: "Awaiting arrival", value: awaiting, tone: "text-amber-300" },
            { label: "On premises", value: onPremises, tone: "text-emerald-300" },
            { label: "Departed", value: departed, tone: "text-slate-300" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <p className={`text-2xl font-semibold tabular-nums ${stat.tone}`}>{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "vendor", label: "Vendor Arrival" },
            { value: "visitor", label: "Visitor Arrival" },
            { value: "employee", label: "Employee Exit" },
          ]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pass ID, name, company or vehicle…"
            className="pl-9"
            aria-label="Search today's queue"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {loading ? (
            <CardGridSkeleton count={4} />
          ) : queue.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white shadow-sm">
              <EmptyState
                icon={<DoorOpen className="h-6 w-6" aria-hidden />}
                title={approvedToday.length === 0 ? "No approved passes for today" : "Nothing matches this filter"}
                description={
                  approvedToday.length === 0
                    ? "Once HR approves today's requests, they appear here for check-in."
                    : "Switch back to All or clear your search."
                }
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    Show all arrivals
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {queue.map((request) => (
                <GateCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ActivityLog />
          <div className="rounded-2xl border border-border bg-white p-4 text-xs leading-relaxed text-slate-500 shadow-sm">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700">
              <UserRound className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
              Shift checklist
            </p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-start gap-2">
                <LogIn className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                Verify ID against the pass before check-in.
              </li>
              <li className="flex items-start gap-2">
                <LogOut className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                Record check-out so passes never stay open overnight.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
