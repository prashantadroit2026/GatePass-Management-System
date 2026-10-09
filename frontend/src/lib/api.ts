/**
 * API client — wraps fetch with Bearer token and base URL.
 * All data now comes from the FastAPI backend (real Supabase DB).
 */
import { supabase } from "@/lib/supabase";

// Default: same-origin relative path — on Vercel, /api/* is rewritten to the
// backend service. Set NEXT_PUBLIC_API_URL to override (e.g. local dev).
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

async function getToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(
      body?.message ?? body?.detail ?? `API error ${res.status}`,
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

// ---- Auth helpers (supabase direct) ----
export const authApi = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(cb),
};

// ---- Users ----
export const usersApi = {
  me: () => apiFetch<ApiUser>("/users/me"),
  list: () => apiFetch<ApiUser[]>("/users/"),
  create: (data: CreateUserPayload) =>
    apiFetch<ApiUser>("/users/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<UpdateUserPayload>) =>
    apiFetch<ApiUser>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updatePassword: (id: string, password: string) =>
    apiFetch<{ message: string }>(`/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/users/${id}`, { method: "DELETE" }),
};

// ---- Requests ----
export const requestsApi = {
  list: () => apiFetch<ApiRequest[]>("/requests/"),
  get: (id: string) => apiFetch<ApiRequest>(`/requests/${id}`),
  createLeave: (data: LeavePayload) =>
    apiFetch<ApiRequest>("/requests/leave", { method: "POST", body: JSON.stringify(data) }),
  createVisitor: (data: VisitorPayload) =>
    apiFetch<ApiRequest>("/requests/visitor", { method: "POST", body: JSON.stringify(data) }),
  createVendor: (data: VendorPayload) =>
    apiFetch<ApiRequest>("/requests/vendor", { method: "POST", body: JSON.stringify(data) }),
  approve: (id: string, notes?: string) =>
    apiFetch<ApiRequest>(`/requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
  reject: (id: string, reason: string) =>
    apiFetch<ApiRequest>(`/requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ rejection_reason: reason }),
    }),
  cancel: (id: string, notes?: string) =>
    apiFetch<ApiRequest>(`/requests/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
};

// ---- Gate ----
export const gateApi = {
  log: (data: GateLogPayload) =>
    apiFetch<GateLogOut>("/gate/log", { method: "POST", body: JSON.stringify(data) }),
  logs: (requestId?: string) =>
    apiFetch<GateLogOut[]>(`/gate/logs${requestId ? `?request_id=${requestId}` : ""}`),
  accepted: (params?: { type?: string; search?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.search) q.set("search", params.search);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    return apiFetch<AcceptedItem[]>(`/gate/accepted?${q}`);
  },
};

// ---- Notifications ----
export const notificationsApi = {
  list: () => apiFetch<ApiNotification[]>("/notifications/"),
  markRead: (id: string) =>
    apiFetch<ApiNotification>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    apiFetch<{ message: string }>("/notifications/read-all", { method: "POST" }),
};

// ---- Types ----
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: string;
  employee_id?: string;
}

export interface ApiRequest {
  id: string;
  type: string;
  status: string;
  requester_id: string;
  approver_id?: string;
  notes?: string;
  rejection_reason?: string;
  valid_from?: string;
  valid_until?: string;
  decided_at?: string;
  created_at: string;
  updated_at?: string;
  // Leave
  leave_type?: string;
  leave_days?: number;
  leave_reason?: string;
  // Visitor
  visitor_name?: string;
  visitor_phone?: string;
  visitor_purpose?: string;
  // Vendor
  vendor_item_direction?: string;
  vendor_item_description?: string;
  vendor_company?: string;
}

export interface ApiNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface GateLogCreate {
  request_id: string;
  direction: "in" | "out";
}

export interface GateLogPayload {
  request_id: string;
  direction: "in" | "out";
}

export interface GateLogOut {
  id: string;
  request_id: string;
  logged_by: string;
  direction: string;
  logged_at: string;
  notes?: string;
}

export interface AcceptedItem {
  request_id: string;
  type: string;
  requester_name?: string;
  visitor_name?: string;
  vendor_company?: string;
  next_expected_movement?: string;
}

export interface LeavePayload {
  leave_type: string;
  leave_days?: number;
  leave_reason?: string;
  notes?: string;
}

export interface VisitorPayload {
  visitor_name: string;
  visitor_phone: string;
  visitor_purpose?: string;
  notes?: string;
}

export interface VendorPayload {
  vendor_item_direction?: string;
  vendor_item_description?: string;
  vendor_company?: string;
  notes?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  arrival_date?: string;
  time_slot?: string;
  host_name?: string;
  vehicle_number?: string;
  purpose?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}
