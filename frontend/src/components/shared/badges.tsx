import { cn } from "@/lib/utils";
import type { RequestStatus, RequestType } from "@/types/api";
const S: Record<RequestStatus, string> = { pending: "bg-amber-100 text-amber-900", approved: "bg-green-100 text-green-900", rejected: "bg-red-100 text-red-900", cancelled: "bg-slate-200 text-slate-700", expired: "bg-orange-100 text-orange-900" };
export const StatusBadge = ({ status }: { status: RequestStatus }) => <span className={cn("rounded px-2 py-0.5 text-xs font-semibold capitalize", S[status])}>{status}</span>;
export const TypeBadge = ({ type }: { type: RequestType }) => <span className="rounded border border-ink/30 px-2 py-0.5 text-xs font-medium capitalize">{type}</span>;
export const ErrorState = ({ message }: { message: string }) => <p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">{message}</p>;
export const EmptyState = ({ text }: { text: string }) => <p className="rounded border border-dashed border-ink/30 p-8 text-center text-sm text-ink/60">{text}</p>;
