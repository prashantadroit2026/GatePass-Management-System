import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: { label: string; description?: string }[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-start gap-2 sm:gap-4", className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.label} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "absolute left-[-50%] top-4 h-0.5 w-full",
                  index === 0 ? "hidden" : "bg-slate-200",
                )}
                aria-hidden
              />
              <div
                className={cn(
                  "absolute left-[-50%] top-4 h-0.5 w-full origin-left transition-all",
                  index === 0 ? "hidden" : done ? "bg-indigo-500" : "bg-transparent",
                )}
                aria-hidden
              />
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white transition",
                  done
                    ? "bg-indigo-600 text-white"
                    : active
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
              </div>
            </div>
            <div className="px-1">
              <p
                className={cn(
                  "text-xs font-semibold sm:text-sm",
                  active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400",
                )}
              >
                {step.label}
              </p>
              {step.description ? (
                <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
