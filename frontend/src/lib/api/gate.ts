import { api } from "./client";
import type { AcceptedItem, GateLog, GateLogCreate, RequestType } from "@/types/api";
export const listAccepted = (p: { type?: RequestType; search?: string; limit?: number; offset?: number }) => api<AcceptedItem[]>("/gate/accepted", { params: p });
export const listLogs = (request_id?: string) => api<GateLog[]>("/gate/logs", { params: { request_id } });
export const logMovement = (b: GateLogCreate) => api<GateLog>("/gate/log", { method: "POST", body: b });
