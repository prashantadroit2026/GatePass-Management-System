export type Role = "employee" | "vendor" | "hr" | "admin" | "security";
export type RequestType = "leave" | "visitor" | "vendor";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";
export type GateDirection = "in" | "out";
export type LeaveType = "outing" | "full_leave";
export interface User { id: string; name: string; email: string; role: Role; is_active: boolean; created_at: string; updated_at: string; }
export interface UserCreate { name: string; email: string; password: string; role: Role; }
export interface UserUpdate { name?: string; role?: Role; is_active?: boolean; }
export interface GatepassRequest {
  id: string; type: RequestType; status: RequestStatus; requester_id: string; approver_id: string | null;
  decided_at: string | null; rejection_reason: string | null; valid_from: string | null; valid_until: string | null;
  leave_type: LeaveType | null; leave_days: number | null; leave_reason: string | null;
  visitor_name: string | null; visitor_phone: string | null; visitor_purpose: string | null;
  vendor_item_direction: GateDirection | null; vendor_item_description: string | null; vendor_company: string | null;
  notes: string | null; created_at: string; updated_at: string;
}
export interface LeaveCreate { leave_type: LeaveType; leave_days?: number; leave_reason?: string; notes?: string; }
export interface VisitorCreate { visitor_name: string; visitor_phone: string; visitor_purpose?: string; notes?: string; }
export interface VendorCreate { vendor_item_direction: GateDirection; vendor_item_description: string; vendor_company?: string; notes?: string; }
export interface GateLog { id: string; request_id: string; logged_by: string; direction: GateDirection; logged_at: string; notes: string | null; }
export interface GateLogCreate { request_id: string; direction: GateDirection; notes?: string; }
export interface AcceptedItem {
  id: string; type: RequestType; requester_id: string; requester_name: string | null;
  leave_type: LeaveType | null; visitor_name: string | null; vendor_company: string | null;
  vendor_item_description: string | null; valid_from: string | null; valid_until: string | null;
  next_movement: GateDirection | null;
}
export type NotificationType = "approval" | "rejection" | "vendor_coming" | "vendor_still_inside" | "visitor_still_inside" | "pass_expiring_soon" | "pending_too_long";
export interface Notification { id: string; user_id: string; title: string; message: string; type: NotificationType; related_id: string | null; is_read: boolean; created_at: string; }
export interface ApiError { code: number; message: string; }
