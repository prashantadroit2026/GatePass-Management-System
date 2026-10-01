"use client";

import { Building2, Shield, User, Users } from "lucide-react";
import { useApp } from "@/context/app-context";
import { ROLE_META } from "@/lib/constants";
import type { Role } from "@/types";

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  admin: Users,
  employee: User,
  vendor: Building2,
  security: Shield,
};

/**
 * In live mode, the role is determined by the user's backend account —
 * it is not switchable. This component simply shows the current role badge.
 */
export function RoleSwitcher() {
  const { role } = useApp();
  const Icon = ROLE_ICONS[role];
  const meta = ROLE_META[role];

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-white py-1.5 pl-2.5 pr-3 text-sm font-medium text-slate-700 shadow-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="max-w-24 truncate sm:hidden">{meta.short}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  );
}
