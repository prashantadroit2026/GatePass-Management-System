"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/context/app-context";
import { ROLE_META } from "@/lib/constants";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { MobileNavDrawer, SideNav } from "@/components/layout/side-nav";

function PublicNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print border-b border-border bg-white" aria-label="Vendor portal">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {NAV.vendor.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <span className="ml-auto hidden shrink-0 pl-4 text-xs text-slate-400 sm:block">
          Public self-service · no login required
        </span>
      </div>
    </nav>
  );
}

function RedirectPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-600" aria-hidden />
      <p className="text-sm font-medium text-slate-700">Opening the {label} workspace…</p>
      <p className="text-xs text-slate-400">Role switched — routes are updating.</p>
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { role, roleHome, roleLabel } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pathArea = pathname.split("/")[1] ?? "";
  const mismatch = pathArea !== ROLE_META[role].area;

  useEffect(() => {
    if (mismatch) router.replace(roleHome);
  }, [mismatch, roleHome, router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const showSidebar = role === "admin" || role === "employee";

  return (
    <div className="min-h-screen">
      <Header onMenuOpen={() => setDrawerOpen(true)} />
      {role === "vendor" ? <PublicNav /> : null}

      <div className="flex">
        {showSidebar ? (
          <aside className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-white scrollbar-thin lg:block">
            <SideNav />
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-7xl">{mismatch ? <RedirectPanel label={roleLabel} /> : children}</div>
        </main>
      </div>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
