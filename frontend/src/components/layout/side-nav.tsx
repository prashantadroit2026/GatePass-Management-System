"use client";

import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useApp();
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {items.map((item) => {
        const active =
          item.href === pathname || (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {active ? <ChevronRight className="h-4 w-4 text-indigo-400" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const { roleLabel, role } = useApp();

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {role === "admin" ? "Administration" : "Workspace"}
        </p>
        <div className="mt-2">
          <NavList />
        </div>
      </div>

      <div className="mt-auto rounded-xl border border-border bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current role</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{roleLabel}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Gate 1 · Online
        </p>
        <p className="mt-1 text-[11px] text-slate-400">{APP_NAME} live environment</p>
      </div>
    </div>
  );
}

export function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { roleLabel } = useApp();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} aria-hidden />
      <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-card shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{roleLabel}</p>
            <p className="text-[11px] text-slate-500">Navigation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto scrollbar-thin">
          <SideNav />
        </div>
      </div>
    </div>
  );
}
