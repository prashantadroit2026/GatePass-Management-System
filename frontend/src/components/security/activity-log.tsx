"use client";

import { Activity, LogIn, LogOut } from "lucide-react";
import { useApp } from "@/context/app-context";
import { EmptyState } from "@/components/ui/empty-state";

export function ActivityLog() {
  const { activity } = useApp();
  const entries = [...activity].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 12);

  return (
    <section className="rounded-2xl border border-border bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Activity log</h2>
          <p className="text-xs text-slate-500">Live gate movements · newest first</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </header>
      <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
        {entries.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" aria-hidden />}
            title="No movements yet"
            description="Check-ins and check-outs will stream here in real time."
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    entry.kind === "check_in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {entry.kind === "check_in" ? (
                    <LogIn className="h-4.5 w-4.5" aria-hidden />
                  ) : (
                    <LogOut className="h-4.5 w-4.5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{entry.label}</p>
                  <p className="truncate text-xs text-slate-500">
                    {entry.requestId} · {entry.detail}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">by {entry.actor}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-slate-800">
                    {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    {entry.kind === "check_in" ? "entry" : "exit"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
