"use client";

import { Fragment } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { ROLE_META } from "@/lib/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Permission, Role } from "@/types";

const ROLES: Role[] = ["admin", "employee", "vendor", "security"];

function groupByCategory(permissions: Permission[]): { category: string; items: Permission[] }[] {
  const map = new Map<string, Permission[]>();
  for (const p of permissions) {
    const list = map.get(p.category) ?? [];
    list.push(p);
    map.set(p.category, list);
  }
  return Array.from(map, ([category, items]) => ({ category, items }));
}

export function PermissionMatrix() {
  const { permissions, togglePermission, can } = useApp();
  const groups = groupByCategory(permissions);
  const editable = can("manage_permissions");

  const onToggle = (permission: Permission, role: Role) => {
    if (!editable) return;
    const next = !permission.grants[role];
    togglePermission(permission.id, role);
    toast.success(`${permission.label} · ${ROLE_META[role].label} ${next ? "enabled" : "disabled"}`);
  };

  return (
    <Card>
      <CardHeader
        title="Feature access by role"
        description="Toggle what each role can do. Changes apply instantly across the app."
        actions={
          <span className="hidden items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {permissions.length} features
          </span>
        }
      />
      {!editable ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-medium text-amber-800">
          Editing the matrix is disabled for your role — enable “Edit permission matrix” to make changes.
        </div>
      ) : null}
      <CardContent className="p-0">
        {/* Desktop matrix */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80">
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Feature
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {ROLE_META[role].short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.category}>
                  <tr>
                    <td colSpan={5} className="border-y border-border bg-slate-50/60 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {group.category}
                    </td>
                  </tr>
                  {group.items.map((permission) => (
                    <tr key={permission.id} className="border-b border-border last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-900">{permission.label}</p>
                        <p className="text-xs text-slate-500">{permission.description}</p>
                      </td>
                      {ROLES.map((role) => (
                        <td key={role} className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={permission.grants[role]}
                              disabled={!editable}
                              onChange={() => onToggle(permission, role)}
                              label={`${permission.label} for ${ROLE_META[role].label}`}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-border md:hidden">
          {groups.map((group) => (
            <div key={group.category} className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.category}</p>
              <div className="mt-3 space-y-4">
                {group.items.map((permission) => (
                  <div key={permission.id} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium text-slate-900">{permission.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{permission.description}</p>
                    <ul className="mt-3 space-y-2">
                      {ROLES.map((role) => (
                        <li key={role} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-600">{ROLE_META[role].label}</span>
                          <Switch
                            checked={permission.grants[role]}
                            disabled={!editable}
                            onChange={() => onToggle(permission, role)}
                            label={`${permission.label} for ${ROLE_META[role].label}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <div className="border-t border-border bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
        Toggling a feature off disables the matching actions for that role immediately (for example, approval buttons in the queue).
      </div>
    </Card>
  );
}
