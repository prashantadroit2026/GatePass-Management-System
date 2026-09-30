"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  PauseCircle,
  UserPlus,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/app-context";
import { formatClock, formatDate, toISODate, todayISO } from "@/lib/format";
import { sortNewestFirst, statusCounts, subjectName } from "@/lib/requests";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { RequestDetailButton, RequestReviewActions } from "@/components/admin/request-review";
import type { GateRequest } from "@/types";

export default function AdminOverviewPage() {
  const { requests, activity, currentUser, users } = useApp();
  const today = todayISO();

  const counts = statusCounts(requests);
  const todayRequests = requests.filter((r) => r.date === today);
  const approvedToday = todayRequests.filter((r) => r.status === "approved");
  const onPremises = requests.filter((r) => r.attendance === "on_premises");
  const recent = sortNewestFirst(requests).slice(0, 6);
  const todayActivity = activity
    .filter((a) => toISODate(new Date(a.at)) === today)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const columns: Column<GateRequest>[] = [
    {
      key: "id",
      header: "Pass",
      cell: (r) => (
        <div>
          <span className="font-mono text-sm font-semibold text-slate-900">{r.id}</span>
          <div className="mt-1">
            <TypeBadge type={r.type} />
          </div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Avatar name={subjectName(r)} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{subjectName(r)}</p>
            <p className="truncate text-xs text-slate-500">{r.requester.department}</p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
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
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <RequestReviewActions request={r} compact />
          <RequestDetailButton request={r} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin / HR"
        title={`Good day, ${currentUser.name.split(" ")[0]}`}
        description={`${formatDate(today)} · ${users.length} users in the directory · ${counts.pending} requests awaiting your decision.`}
        actions={
          <>
            <Link href="/admin/users">
              <Button variant="outline" icon={<UserPlus className="h-4 w-4" aria-hidden />}>
                Add user
              </Button>
            </Link>
            <Link href="/admin/approvals">
              <Button icon={<ClipboardList className="h-4 w-4" aria-hidden />}>Open approval queue</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending approvals"
          value={counts.pending}
          hint="Needs an HR decision"
          icon={ClipboardList}
          tone="amber"
        />
        <StatCard
          label="Approved today"
          value={approvedToday.length}
          hint={`${todayRequests.length} requests scheduled today`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="On premises now"
          value={onPremises.length}
          hint="Checked in at the gate"
          icon={DoorOpen}
          tone="indigo"
        />
        <StatCard
          label="Held / rejected"
          value={counts.hold + counts.rejected}
          hint={`${counts.hold} on hold · ${counts.rejected} rejected`}
          icon={PauseCircle}
          tone="rose"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              title="Recent requests"
              description="Latest activity across all request types"
              actions={
                <Link href="/admin/approvals">
                  <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" aria-hidden />}>
                    View all
                  </Button>
                </Link>
              }
            />
            <DataTable
              columns={columns}
              rows={recent}
              rowKey={(r) => r.id}
              cardTitle={(r) => (
                <span className="flex items-center gap-2">
                  <span className="font-mono">{r.id}</span>
                  <StatusBadge status={r.status} />
                </span>
              )}
              cardSubtitle={(r) => `${subjectName(r)} · ${formatDate(r.date)}`}
              cardActions={(r) => (
                <>
                  <RequestReviewActions request={r} />
                  <RequestDetailButton request={r} />
                </>
              )}
              empty={<EmptyState title="No requests yet" description="Submitted passes will appear here." />}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Today's gate activity" description="Live entry and exit movements" />
            <CardContent className="p-0">
              {todayActivity.length === 0 ? (
                <EmptyState
                  icon={<Activity className="h-6 w-6" aria-hidden />}
                  title="No movement yet today"
                  description="Check-ins and check-outs from Gate 1 will stream here."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {todayActivity.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                          entry.kind === "check_in" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {entry.kind === "check_in" ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        ) : (
                          <XCircle className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{entry.label}</p>
                        <p className="truncate text-xs text-slate-500">
                          {entry.kind === "check_in" ? "Checked in" : "Checked out"} · {entry.detail}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold tabular-nums text-slate-700">{formatClock(entry.at)}</p>
                        <p className="text-[11px] text-slate-400">{entry.actor}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Queue snapshot" description="Click a status to jump into the queue" />
            <CardContent className="grid grid-cols-2 gap-3">
              {(["pending", "approved", "hold", "rejected"] as const).map((key) => (
                <Link
                  key={key}
                  href="/admin/approvals"
                  className="rounded-xl border border-border bg-slate-50 px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {key === "hold" ? "On hold" : key}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{counts[key]}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
