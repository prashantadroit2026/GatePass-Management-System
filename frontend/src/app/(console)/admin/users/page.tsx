"use client";

import { Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/context/app-context";
import { ROLE_META } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AddUserForm } from "@/components/admin/add-user-form";
import { useSimulatedLoad } from "@/hooks/use-app";
import type { AppUser } from "@/types";

export default function UsersPage() {
  const { users } = useApp();
  const loading = useSimulatedLoad();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.employeeId, u.department, u.email, u.hod].join(" ").toLowerCase().includes(q),
    );
  }, [users, query]);

  const columns: Column<AppUser>[] = [
    {
      key: "name",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.photo} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
            <p className="truncate text-xs text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "employeeId", header: "Employee ID", cell: (u) => <span className="font-mono text-xs">{u.employeeId}</span> },
    { key: "department", header: "Department", cell: (u) => u.department },
    { key: "hod", header: "HOD", cell: (u) => <span className="text-slate-600">{u.hod}</span> },
    {
      key: "role",
      header: "Role",
      cell: (u) => <Badge tone={u.role === "admin" ? "indigo" : u.role === "security" ? "slate" : "sky"}>{ROLE_META[u.role].short}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge tone={u.status === "active" ? "emerald" : "amber"} dot>
          {u.status}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin / HR"
        title="User Management"
        description="Add employees to the directory — photo, department, HOD and credentials in one form."
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <AddUserForm />
        </div>

        <div className="xl:col-span-8">
          <Card>
            <CardHeader
              title="Directory"
              description={`${users.length} users`}
              actions={
                <div className="w-full sm:w-64">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, ID, department…"
                    aria-label="Search users"
                  />
                </div>
              }
            />
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(u) => u.id}
              loading={loading}
              cardTitle={(u) => (
                <span className="flex items-center gap-2">
                  <Avatar name={u.name} src={u.photo} size="sm" />
                  {u.name}
                </span>
              )}
              cardSubtitle={(u) => `${u.employeeId} · ${u.email}`}
              empty={
                <EmptyState
                  icon={<UsersIcon className="h-6 w-6" aria-hidden />}
                  title="No users found"
                  description="Try a different name, employee ID or department."
                />
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}
