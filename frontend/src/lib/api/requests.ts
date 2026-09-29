import { api } from "./client";
import type { GatepassRequest, RequestType } from "@/types/api";
export type DecisionMode = "approve" | "reject" | "cancel";
export const listRequests = () => api<GatepassRequest[]>("/requests/");
export const getRequest = (id: string) => api<GatepassRequest>(`/requests/${id}`);
export const createRequest = (t: RequestType, body: unknown) => api<GatepassRequest>(`/requests/${t}`, { method: "POST", body });
export const decide = (id: string, mode: DecisionMode, text: string) =>
  api<GatepassRequest>(`/requests/${id}/${mode}`, { method: "POST", body: mode === "reject" ? { rejection_reason: text } : text ? { notes: text } : {} });
