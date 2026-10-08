"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function shortId(id: string, head = 8): string {
  if (!id) return "—";
  return id.length > head + 4 ? `${id.slice(0, head)}…` : id;
}

export function PassId({
  id,
  className,
  head = 8,
}: {
  id: string;
  className?: string;
  head?: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
      <span className="truncate font-mono" title={id}>
        {shortId(id, head)}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy pass ID"}
        title={copied ? "Copied" : "Copy full ID"}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      </button>
    </span>
  );
}
