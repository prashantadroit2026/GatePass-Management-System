import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  trend?: "up" | "down";
  className?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <div className={cn("card-shell p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
              {trend ? <TrendIcon className={cn("h-3.5 w-3.5", trend === "up" ? "text-emerald-500" : "text-rose-500")} /> : null}
              {hint}
            </p>
          ) : null}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
