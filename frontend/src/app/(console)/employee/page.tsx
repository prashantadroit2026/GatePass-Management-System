"use client";

import { CalendarPlus, CheckCircle2, ClipboardList, DoorOpen, Inbox, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/app-context";
import { REQUEST_TYPE_META } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { employeeRequests, statusCounts, subjectName } from "@/lib/requests";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { AttendanceBadge, StatusBadge, TypeBadge } from "@/components/ui/badge";
import { RequestDetailButton } from "@/components/admin/request-review";

export default function EmployeeOverviewPage() {
  const { requests, currentUser, activity } = useApp();
  const mine = employeeRequests(requests, currentUser.employeeId);
  const counts = statusCounts(mine);
  const recent = mine.slice(0, 5);
  const recentMovements = activity
    .filter((a) => mine.some((r) => r.id === a.requestId))
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Employee"
        title={`Hello, ${currentUser.name.split(" ")[0]}`}
        description={`${currentUser.department} · HOD ${currentUser.hod} · ${currentUser.employeeId}`}
        actions={
          <>
            <Link href="/employee/visitor">
              <Button variant="outline" icon={<UserPlus className="h-4 w-4" aria-hidden />}>
                Visitor pass
              </Button>
            </Link>
            <Link href="/employee/gate-pass">
              <Button icon={<CalendarPlus className="h-4 w-4" aria-hidden />}>New gate pass</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting approval" value={counts.pending} hint="With HR right now" icon={Inbox} tone="amber" />
        <StatCard label="Approved" value={counts.approved} hint="Cleared for the gate" icon={CheckCircle2} tone="emerald" />
        <StatCard label="On hold" value={counts.hold} hint="Needs your attention" icon={ClipboardList} tone="amber" />
        <StatCard label="Rejected" value={counts.rejected} hint="See the reviewer note" icon={XCircle} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              title="My recent requests"
              description={`${mine.length} total submissions`}
              actions={
                <Link href="/employee/requests">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              }
            />
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <EmptyState
                  title="No requests yet"
                  description="Create your first gate or visitor pass to see it tracked here."
                  action={
                    <Link href="/employee/gate-pass">
                      <Button icon={<CalendarPlus className="h-4 w-4" aria-hidden />}>Create gate pass</Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <Avatar name={subjectName(r)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900">{r.id}</span>
                          <TypeBadge type={r.type} />
                          {r.attendance !== "scheduled" ? <AttendanceBadge attendance={r.attendance} /> : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {REQUEST_TYPE_META[r.type].label} · {formatDate(r.date)} · {r.purpose}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <RequestDetailButton request={r} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick actions" />
            <CardContent className="flex flex-col gap-2">
              <Link href="/employee/gate-pass">
                <Button variant="outline" className="w-full justify-start" icon={<CalendarPlus className="h-4 w-4" aria-hidden />}>
                  Request a gate pass
                </Button>
              </Link>
              <Link href="/employee/visitor">
                <Button variant="outline" className="w-full justify-start" icon={<UserPlus className="h-4 w-4" aria-hidden />}>
                  Register a visitor
                </Button>
              </Link>
              <Link href="/employee/requests">
                <Button variant="outline" className="w-full justify-start" icon={<ClipboardList className="h-4 w-4" aria-hidden />}>
                  Track request status
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="My gate movements" description="Entry and exit recorded at Gate 1" />
            <CardContent className="p-0">
              {recentMovements.length === 0 ? (
                <EmptyState
                  icon={<DoorOpen className="h-6 w-6" aria-hidden />}
                  title="No movements yet"
                  description="Your check-ins and check-outs will appear here."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {recentMovements.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          entry.kind === "check_in" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {entry.kind === "check_in" ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        ) : (
                          <DoorOpen className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{entry.label}</p>
                        <p className="truncate text-xs text-slate-500">{entry.requestId}</p>
                      </div>
                      <p className="text-xs font-semibold tabular-nums text-slate-600">
                        {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
