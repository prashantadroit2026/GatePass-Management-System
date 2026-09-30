"use client";

import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PermissionMatrix } from "@/components/admin/permission-matrix";

export default function PermissionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin / HR"
        title="Permission Matrix"
        description="Features down the side, roles across the top. Every switch takes effect immediately for that role's UI."
      />
      <PermissionMatrix />
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-white p-4">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
        <p className="text-sm text-slate-600">
          Try turning off <span className="font-medium text-slate-900">Approve / hold / reject requests</span> for Admin,
          then open the Approval Queue — the action buttons become disabled with an explanatory tooltip. Toggle{" "}
          <span className="font-medium text-slate-900">Check-in / check-out at the gate</span> for Security to do the same
          on the gate dashboard.
        </p>
      </div>
    </>
  );
}
