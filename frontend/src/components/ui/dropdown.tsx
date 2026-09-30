"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  panelClassName?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  panelClassName,
  triggerClassName,
  ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex items-center", triggerClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-2 min-w-56 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon: Icon,
  danger = false,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100",
        active && "bg-indigo-50 text-indigo-700 hover:bg-indigo-50",
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {active ? <ChevronDown className="h-3.5 w-3.5 rotate-90" aria-hidden /> : null}
    </button>
  );
}
