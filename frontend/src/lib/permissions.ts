import type { GatepassRequest, Role, User } from "@/types/api";
export const ROLE_PERMISSIONS = {
  employee: ["create_leave_request", "create_visitor_request", "cancel_request"],
  vendor: ["create_vendor_entry_request", "cancel_request"],
  hr: ["create_leave_request", "create_visitor_request", "approve_reject_request", "cancel_request", "manage_user_accounts", "view_accepted_list", "view_all_requests"],
  admin: ["approve_reject_request", "cancel_request", "manage_user_accounts", "view_accepted_list", "view_all_requests"],
  security: ["view_accepted_list", "log_gate_movement"],
} as const satisfies Record<Role, readonly string[]>;
export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];
export const can = (role: Role, p: Permission) => (ROLE_PERMISSIONS[role] as readonly string[]).includes(p);
/** Requester role is not on the request; callers pass a role map built from GET /users/ (hr/admin only). */
export function canDecide(me: User, r: GatepassRequest, roles: Record<string, Role>) {
  if (r.status !== "pending" || r.requester_id === me.id) return false;
  const rr = roles[r.requester_id];
  if (me.role === "hr") return rr === "employee" || rr === "vendor";
  if (me.role === "admin") return rr === "hr";
  return false;
}
export const canCancel = (me: User, r: GatepassRequest) =>
  r.status === "pending" && can(me.role, "cancel_request") && (r.requester_id === me.id || me.role === "hr" || me.role === "admin");
export const creatableTypes = (role: Role) => [
  ...(can(role, "create_leave_request") ? (["leave"] as const) : []),
  ...(can(role, "create_visitor_request") ? (["visitor"] as const) : []),
  ...(can(role, "create_vendor_entry_request") ? (["vendor"] as const) : []),
];
