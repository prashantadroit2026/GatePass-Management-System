"use client";

import { Inbox, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/context/app-context";
import { REQUEST_TYPE_META } from "@/lib/constants";
import { formatDate, formatTimeSlot } from "@/lib/format";
import { employeeRequests, subjectName } from "@/lib/requests";
import { PassId, shortId } from "@/components/ui/pass-id";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { RequestDetailButton } from "@/components/admin/request-review";
import { useSimulatedLoad } from "@/hooks/use-app";
import type { GateRequest, RequestStatus } from "@/types";

type Filter = "all" | RequestStatus;

export default function MyRequestsPage() {
  const { requests, currentUser } = useApp();
  const loading = useSimulatedLoad();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const mine = useMemo(() => employeeRequests(requests, currentUser.employeeId), [requests, currentUser.employeeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.id, r.purpose, subjectName(r), r.guest?.company ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [mine, filter, query]);

  const counts = mine.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { all: mine.length, pending: 0, approved: 0, hold: 0, rejected: 0 } as Record<Filter, number>,
  );

  const columns: Column<GateRequest>[] = [
    {
      key: "id",
      header: "Pass ID",
      hideOnMobile: true,
      cell: (r) => (
        <div>
          <PassId id={r.id} className="text-sm font-semibold text-slate-900" />
          <div className="mt-1">
            <TypeBadge type={r.type} />
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose / Guest",
      hideOnMobile: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{subjectName(r)}</p>
          <p className="truncate text-xs text-slate-500">{r.purpose}</p>
          {r.guest?.company ? <p className="truncate text-xs text-slate-400">{r.guest.company}</p> : null}
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (r) => (
        <div>
          <p className="text-sm text-slate-700">{formatDate(r.date)}</p>
          <p className="text-xs text-slate-500">
            {formatTimeSlot(r.timeSlot)}
            {r.expectedReturn ? ` · return by ${r.expectedReturn}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (r) => (
        <div>
          <StatusBadge status={r.status} />
          {r.review?.note ? (
            <p className="mt-1.5 max-w-56 text-xs leading-relaxed text-slate-500" title={r.review.note}>
              {r.review.note}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      hideOnMobile: true,
      cell: (r) => <RequestDetailButton request={r} />,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Employee"
        title="My Requests"
        description="Live status for every gate pass and visitor pass you have submitted."
      />

      <div className="card-shell mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by pass ID, purpose or guest…"
            className="pl-9"
            aria-label="Search my requests"
          />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "hold", label: "Hold" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <p className="hidden text-xs text-slate-500 lg:block">
          {counts.all} total · {counts.pending} pending · {counts.approved} approved
        </p>
      </div>

      <div className="card-shell overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filtered.length}</span> of {mine.length} requests
          </p>
          <p className="text-xs text-slate-400">Newest first</p>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={loading}
          loadingRows={4}
          cardTitle={(r) => subjectName(r)}
          cardBadge={(r) => <StatusBadge status={r.status} />}
          cardSubtitle={(r) => `Pass ${shortId(r.id)} · ${REQUEST_TYPE_META[r.type].label} · ${formatDate(r.date)}`}
          cardActions={(r) => <RequestDetailButton request={r} />}
          empty={
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden />}
              title={mine.length === 0 ? "You have not submitted anything yet" : "No requests match this filter"}
              description={
                mine.length === 0
                  ? "Create a gate pass or register a visitor to get started."
                  : "Try another status or clear your search."
              }
              action={
                mine.length === 0 ? (
                  <Link href="/employee/gate-pass">
                    <Button>Create a gate pass</Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          }
        />
      </div>
    </>
  );
}
