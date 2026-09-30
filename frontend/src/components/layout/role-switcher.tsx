"use client";

import { Building2, Check, ChevronsUpDown, Shield, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { ROLE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import type { Role } from "@/types";

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  admin: Users,
  employee: User,
  vendor: Building2,
  security: Shield,
};

const ORDER: Role[] = ["admin", "employee", "vendor", "security"];

export function RoleSwitcher() {
  const { role, setRole } = useApp();
  const router = useRouter();
  const Icon = ROLE_ICONS[role];
  const meta = ROLE_META[role];

  const pick = (next: Role) => {
    if (next === role) return;
    setRole(next);
    router.push(ROLE_META[next].home);
    toast.info(`Switched to ${ROLE_META[next].label} view`);
  };

  return (
    <Dropdown
      ariaLabel="Switch role"
      align="left"
      panelClassName="min-w-72 p-2"
      trigger={
        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-white py-1.5 pl-2.5 pr-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="max-w-24 truncate sm:hidden">{meta.short}</span>
          <span className="hidden sm:inline">{meta.label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        </span>
      }
    >
      {(close) => (
        <div>
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Role switcher
          </p>
          {ORDER.map((value) => {
            const ItemIcon = ROLE_ICONS[value];
            const item = ROLE_META[value];
            return (
              <DropdownItem
                key={value}
                icon={ItemIcon}
                active={value === role}
                onClick={() => {
                  pick(value);
                  close();
                }}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="block text-xs text-slate-500">{item.description}</span>
              </DropdownItem>
            );
          })}
          <div className="mt-1 flex items-center gap-1.5 border-t border-border px-3 pb-1 pt-2 text-[11px] text-slate-400">
            <Check className="h-3 w-3" aria-hidden />
            Changes apply instantly across the app
          </div>
        </div>
      )}
    </Dropdown>
  );
}
