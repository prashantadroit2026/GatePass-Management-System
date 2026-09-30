"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  hideOnMobile?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  loadingRows?: number;
  empty?: ReactNode;
  cardTitle?: (row: T) => ReactNode;
  cardSubtitle?: (row: T) => ReactNode;
  cardActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  className?: string;
}

const ALIGN: Record<NonNullable<Column<never>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  loadingRows = 4,
  empty,
  cardTitle,
  cardSubtitle,
  cardActions,
  onRowClick,
  rowClassName,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing here yet" description="No records match this view." />}</>;
  }

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    ALIGN[col.align ?? "left"],
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-slate-50/70",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(row),
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 align-middle text-slate-700",
                      ALIGN[col.align ?? "left"],
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)} className="card-shell p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {cardTitle ? (
                  <div className="truncate text-sm font-semibold text-slate-900">{cardTitle(row)}</div>
                ) : null}
                {cardSubtitle ? (
                  <div className="mt-0.5 truncate text-xs text-slate-500">{cardSubtitle(row)}</div>
                ) : null}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {col.header}
                    </dt>
                    <dd className="mt-0.5 truncate text-sm text-slate-700">{col.cell(row)}</dd>
                  </div>
                ))}
            </dl>
            {cardActions ? <div className="mt-3 flex flex-wrap gap-2">{cardActions(row)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
