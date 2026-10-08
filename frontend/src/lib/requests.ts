import { todayISO } from "@/lib/format";
import type { GateRequest, RequestStatus } from "@/types";

const PLACEHOLDER_NAME = /^\s*(new[\s_-]*)+!*\s*$/i;

export function displayName(name: string | null | undefined, fallback = "Unnamed"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed || PLACEHOLDER_NAME.test(trimmed) || trimmed === "—" || trimmed === "-") return fallback;
  return trimmed;
}

export function subjectName(request: GateRequest): string {
  if (request.type === "employee") return displayName(request.requester.name, "Employee");
  const guest = displayName(request.guest?.name, "");
  return guest || displayName(request.requester.name);
}

export function subjectCompany(request: GateRequest): string {
  if (request.type === "employee") return displayName(request.requester.department, "—");
  return displayName(request.guest?.company, "—");
}

export function isToday(request: GateRequest, today = todayISO()): boolean {
  return request.date === today;
}

export function statusCounts(requests: GateRequest[]): Record<RequestStatus, number> {
  return requests.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { pending: 0, approved: 0, hold: 0, rejected: 0 } as Record<RequestStatus, number>,
  );
}

export function sortNewestFirst(requests: GateRequest[]): GateRequest[] {
  return [...requests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function employeeRequests(requests: GateRequest[], employeeId: string): GateRequest[] {
  return sortNewestFirst(requests.filter((r) => r.requester.employeeId === employeeId));
}
