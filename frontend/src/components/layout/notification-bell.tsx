"use client";

import { Bell, CheckCheck, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { useApp } from "@/context/app-context";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import type { NotificationTone } from "@/types";

const TONES: Record<NotificationTone, string> = {
  info: "bg-sky-100 text-sky-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-rose-100 text-rose-600",
};

const ICONS: Record<NotificationTone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: ShieldCheck,
  warning: TriangleAlert,
  danger: Info,
};

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp();
  const visible = notifications.slice(0, 8);

  return (
    <Dropdown
      ariaLabel="Notifications"
      panelClassName="w-[min(22rem,calc(100vw-2rem))] p-0"
      trigger={
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-slate-600 shadow-sm transition hover:bg-slate-50">
          <Bell className="h-4.5 w-4.5" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "You are all caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {visible.length === 0 ? (
              <EmptyState title="No notifications" description="Approval and gate activity will appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((n) => {
                  const Tone = ICONS[n.tone];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationRead(n.id);
                          close();
                        }}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50",
                          !n.read && "bg-indigo-50/40",
                        )}
                      >
                        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONES[n.tone])}>
                          <Tone className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-900">{n.title}</span>
                            {!n.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /> : null}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{n.message}</span>
                          <span className="mt-1 block text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
