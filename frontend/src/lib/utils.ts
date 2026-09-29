import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
export const cn = (...a: ClassValue[]) => clsx(a);
export const TZ = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const fmt = (s: string | null) => (s ? format(new Date(s), "dd MMM yyyy, HH:mm") : "—");
export type Validity = "upcoming" | "ok" | "soon" | "expired";
export function validity(from: string | null, until: string | null, now = Date.now()): Validity {
  if (!until) return "ok";
  if (from && now < new Date(from).getTime()) return "upcoming";
  const left = new Date(until).getTime() - now;
  return left < 0 ? "expired" : left < 2 * 3600e3 ? "soon" : "ok";
}
export const VALIDITY_CLS: Record<Validity, string> = { upcoming: "text-slate-600", ok: "text-green-700", soon: "text-amber-600 font-semibold", expired: "text-red-700" };
