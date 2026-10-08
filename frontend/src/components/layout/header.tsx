"use client";

import { CalendarDays, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { useClock } from "@/hooks/use-app";
import { APP_NAME, ORG_NAME } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LogoImage } from "@/components/ui/logo";

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { currentUser, roleHome, signOut } = useApp();
  const router = useRouter();
  const now = useClock();

  const handleSignOut = async (close: () => void) => {
    close();
    await signOut();
    toast.success("Signed out successfully");
    router.replace("/login");
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-4.5 w-4.5" aria-hidden />
        </button>

        <Link href={roleHome} className="flex items-center gap-2.5">
          <LogoImage
            alt={`${ORG_NAME} logo`}
            priority
            className="h-9 w-auto"
            fallbackClassName="h-9 w-9"
          />
          <span className="hidden leading-tight sm:block">
            <span className="block text-[15px] font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
            <span className="block text-[11px] text-slate-500">{ORG_NAME}</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm shadow-sm md:flex">
            <CalendarDays className="h-4 w-4 text-indigo-500" aria-hidden />
            <span className="text-slate-600">{format(now, "EEE, dd MMM yyyy")}</span>
            <span className="h-4 w-px bg-border" aria-hidden />
            <span className="font-medium tabular-nums text-slate-900">{format(now, "HH:mm:ss")}</span>
          </div>

          {currentUser.id !== "guest" ? <NotificationBell /> : null}

          {currentUser.id === "guest" ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Staff sign in
            </Link>
          ) : (
            <Dropdown
              ariaLabel="Profile menu"
              panelClassName="min-w-64 p-2"
              trigger={
                <span className="inline-flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-slate-100">
                  <Avatar name={currentUser.name} size="sm" />
                  <span className="hidden text-left leading-tight md:block">
                    <span className="block text-sm font-medium text-slate-900">{currentUser.name}</span>
                    <span className="block text-[11px] text-slate-500">{currentUser.title}</span>
                  </span>
                </span>
              }
            >
              {(close) => (
                <div>
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
                    <Avatar name={currentUser.name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{currentUser.name}</p>
                      <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
                      <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-indigo-600">
                        {currentUser.title}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 border-t border-border pt-2">
                    <DropdownItem
                      icon={LogOut}
                      danger
                      onClick={() => handleSignOut(close)}
                    >
                      Sign out
                    </DropdownItem>
                  </div>
                </div>
              )}
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
}
