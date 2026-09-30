import { format } from "date-fns";

/** yyyy-MM-dd for a given date (defaults to today, local time). */
export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return format(new Date(y, m - 1, d), "dd MMM yyyy");
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return format(new Date(y, m - 1, d), "EEE, dd MMM");
}

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "HH:mm");
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, HH:mm");
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return minutes > 0 ? `${minutes}m ago` : `${Math.abs(minutes)}m from now`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return hours > 0 ? `${hours}h ago` : `${Math.abs(hours)}h from now`;
  const days = Math.round(hours / 24);
  return days > 0 ? `${days}d ago` : `${Math.abs(days)}d from now`;
}
