"use client";

import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/context/app-context";
import { REQUEST_TYPE_META } from "@/lib/constants";
import { formatDate, todayISO } from "@/lib/format";
import { sortNewestFirst, statusCounts, subjectName } from "@/lib/requests";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { RequestDetailButton, RequestReviewActions } from "@/components/admin/request-review";
import { useSimulatedLoad } from "@/hooks/use-app";
import type { GateRequest, RequestStatus, RequestType } from "@/types";

type StatusFilter = "all" | RequestStatus;

export default function ApprovalsPage() {
  const { requests } = useApp();
  const loading = useSimulatedLoad();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<"all" | RequestType>("all");
  const [query, setQuery] = useState("");

  const counts = statusCounts(requests);
  const today = todayISO();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNewestFirst(requests).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (type !== "all" && r.type !== type) return false;
      if (!q) return true;
      return [r.id, subjectName(r), r.requester.name, r.requester.department, r.purpose, r.guest?.company ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [requests, status, type, query]);

  const columns: Column<GateRequest>[] = [
    {
      key: "id",
      header: "Pass ID",
      cell: (r) => (
        <div>
          <span className="font-mono text-sm font-semibold text-slate-900">{r.id}</span>
          {r.date === today ? <span className="ml-2 text-[10px] font-bold uppercase text-indigo-500">Today</span> : null}
        </div>
      ),
    },
    {
      key: "subject",
      header: "Requester / Subject",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{subjectName(r)}</p>
          <p className="truncate text-xs text-slate-500">
            {r.requester.name} · {r.requester.department}
          </p>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (r) => <TypeBadge type={r.type} /> },
    {
      key: "schedule",
      header: "Schedule",
      cell: (r) => (
        <div>
          <p className="text-sm text-slate-700">{formatDate(r.date)}</p>
          <p className="text-xs text-slate-500">{r.timeSlot}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (r.status === "pending" ? <StatusBadge status="pending" /> : <StatusBadge status={r.status} />),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <RequestReviewActions request={r} compact />
          <RequestDetailButton request={r} />
        </div>
      ),
    },
  ];

  const clearFilters = () => {
    setStatus("all");
    setType("all");
    setQuery("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin / HR"
        title="Unified Approval Queue"
        description="Every employee, visitor and vendor request in one place — approve, hold or reject with an optional note."
        actions={
          <Link href="/admin/users">
            <Button variant="outline">Manage users</Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending", "approved", "hold", "rejected"] as RequestStatus[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(status === key ? "all" : key)}
            className={`card-shell px-4 py-3 text-left transition hover:border-indigo-300 ${
              status === key ? "border-indigo-400 ring-1 ring-indigo-300" : ""
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{key === "hold" ? "On hold" : key}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[key]}</p>
          </button>
        ))}
      </div>

      <div className="card-shell mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by pass ID, name, department or purpose…"
            className="pl-9"
            aria-label="Search requests"
          />
        </div>
        <Segmented
          className="lg:w-auto"
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "hold", label: "Hold" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <Select value={type} onChange={(e) => setType(e.target.value as RequestType | "all")} aria-label="Filter by type" className="lg:w-48">
          <option value="all">All request types</option>
          <option value="employee">{REQUEST_TYPE_META.employee.label}</option>
          <option value="visitor">{REQUEST_TYPE_META.visitor.label}</option>
          <option value="vendor">{REQUEST_TYPE_META.vendor.label}</option>
        </Select>
      </div>

      <div className="card-shell overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filtered.length}</span> of {requests.length} requests
          </p>
          <p className="text-xs text-slate-400">Newest first</p>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={loading}
          loadingRows={5}
          cardTitle={(r) => (
            <span className="flex items-center gap-2">
              <span className="font-mono">{r.id}</span>
              <StatusBadge status={r.status} />
            </span>
          )}
          cardSubtitle={(r) => `${subjectName(r)} · ${REQUEST_TYPE_META[r.type].label}`}
          cardActions={(r) => (
            <>
              <RequestReviewActions request={r} />
              <RequestDetailButton request={r} />
            </>
          )}
          empty={
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" aria-hidden />}
              title="No requests match these filters"
              description="Try a different status, request type or search term."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          }
        />
      </div>
    </>
  );
}
