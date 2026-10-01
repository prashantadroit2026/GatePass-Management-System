export type Role = "admin" | "employee" | "vendor" | "security";

export type RequestType = "employee" | "visitor" | "vendor";

export type RequestStatus = "pending" | "approved" | "hold" | "rejected";

export type Attendance = "scheduled" | "on_premises" | "departed";

export type PassMode = "full_time" | "half_time";

export interface EmployeeRef {
  name: string;
  email: string;
  department: string;
  hod: string;
  employeeId: string;
}

export interface GuestRef {
  name: string;
  contact?: string;
  company?: string;
  visitors?: number;
}

export interface ReviewInfo {
  note?: string;
  by?: string;
  at?: string;
}

export interface GateRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  mode?: PassMode;
  /** Scheduled date, yyyy-MM-dd */
  date: string;
  timeSlot: string;
  expectedReturn?: string;
  purpose: string;
  vehicle?: string;
  createdAt: string;
  requester: EmployeeRef;
  guest?: GuestRef;
  review?: ReviewInfo;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  attendance: Attendance;
}

export type NewRequest = Omit<
  GateRequest,
  "id" | "status" | "createdAt" | "attendance" | "review" | "checkInAt" | "checkOutAt"
>;

export type AppUser = {
  id: string;
  name: string;
  department: string;
  employeeId: string;
  hod: string;
  email: string;
  role: Role;
  photo?: string;
  status: "active" | "invited";
  createdAt: string;
};

export type NewUser = Omit<AppUser, "id" | "createdAt" | "status" | "photo"> & { photo?: string };

export interface Permission {
  id: string;
  label: string;
  description: string;
  category: string;
  grants: Record<Role, boolean>;
}

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  createdAt: string;
  read: boolean;
}

export type ActivityKind = "check_in" | "check_out";

export interface ActivityEntry {
  id: string;
  requestId: string;
  kind: ActivityKind;
  label: string;
  detail: string;
  at: string;
  actor: string;
}

export interface UserProfile extends EmployeeRef {
  id?: string;
  role: Role;
  title: string;
}
