"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getRequest, listRequests } from "@/lib/api/requests";
import type { Role, User } from "@/types/api";
export const useRequests = () => useQuery({ queryKey: ["requests"], queryFn: listRequests });
export const useRequest = (id: string) => useQuery({ queryKey: ["request", id], queryFn: () => getRequest(id), retry: false });
/** Requester roles for the approval matrix; only hr/admin may call GET /users/. */
export function useRoleMap(role?: Role) {
  const q = useQuery({ queryKey: ["users"], queryFn: () => api<User[]>("/users/"), enabled: role === "hr" || role === "admin" });
  return Object.fromEntries((q.data ?? []).map((u) => [u.id, u.role])) as Record<string, Role>;
}
