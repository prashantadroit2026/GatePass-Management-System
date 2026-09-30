import { todayISO } from "@/lib/format";
import type { GateRequest, RequestStatus } from "@/types";

export function subjectName(request: GateRequest): string {
  if (request.type === "employee") return request.requester.name;
  return request.guest?.name ?? request.requester.name;
}

export function subjectCompany(request: GateRequest): string {
  if (request.type === "employee") return request.requester.department;
  return request.guest?.company ?? "—";
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
