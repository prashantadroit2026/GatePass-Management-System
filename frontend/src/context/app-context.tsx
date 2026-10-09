"use client";

/**
 * Live AppContext — replaces the old demo context.
 *
 * Data comes entirely from the FastAPI backend (real Supabase DB).
 * Auth is provided by AuthContext/Supabase.
 *
 * This context maps backend API shapes to the frontend GateRequest / AppUser /
 * ActivityEntry types so all existing page and component code keeps working.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/auth-context";
import {
  requestsApi,
  notificationsApi,
  usersApi,
  gateApi,
  type ApiRequest,
  type ApiUser,
  type ApiNotification,
  type GateLogOut,
} from "@/lib/api";
import { ROLE_META } from "@/lib/constants";
import type {
  GateRequest,
  AppUser,
  AppNotification,
  ActivityEntry,
  Permission,
  Role,
  RequestStatus,
  NewRequest,
  NewUser,
  UserProfile,
} from "@/types";

// ---------------------------------------------------------------------------
// UI Role mapping
// ---------------------------------------------------------------------------

type UIRole = "admin" | "employee" | "vendor" | "security";

function backendRoleToUI(role: string | undefined): UIRole {
  if (!role) return "employee";
  if (role === "admin" || role === "hr") return "admin";
  if (role === "vendor") return "vendor";
  if (role === "security") return "security";
  return "employee";
}

// ---------------------------------------------------------------------------
// Data mappers — backend → frontend types
// ---------------------------------------------------------------------------

function mapRequest(r: ApiRequest, usersById: Record<string, ApiUser>): GateRequest | null {
  const requesterUser = r.requester_id ? usersById[r.requester_id] : null;

  let extraNotes: Record<string, string> = {};
  if (r.notes) {
    try {
      if (r.notes.trim().startsWith("{")) {
        extraNotes = JSON.parse(r.notes);
      }
    } catch {
      extraNotes = {};
    }
  }

  const requester = {
    name:
      extraNotes.employeeName ??
      extraNotes.contact_name ??
      extraNotes.contactName ??
      requesterUser?.name ??
      (r.type === "vendor" ? (r.vendor_company ?? "Vendor Contact") : (r.requester_id || "Requester")),
    email:
      extraNotes.employeeEmail ??
      extraNotes.contact_email ??
      extraNotes.contactEmail ??
      requesterUser?.email ??
      "",
    department:
      extraNotes.employeeDepartment ??
      extraNotes.company ??
      r.vendor_company ??
      requesterUser?.department ??
      "—",
    hod:
      extraNotes.employeeHod ??
      extraNotes.host_name ??
      extraNotes.host ??
      "—",
    employeeId:
      extraNotes.employeeId ??
      requesterUser?.employee_id ??
      r.requester_id ??
      "—",
  };

  // Determine type from backend `type` field
  const type = (r.type === "leave" ? "employee" : r.type) as GateRequest["type"];

  // Determine status mapping
  const statusMap: Record<string, RequestStatus> = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    cancelled: "rejected",
    expired: "rejected",
    on_hold: "hold",
  };
  const status: RequestStatus = statusMap[r.status] ?? "pending";

  // Guest info for visitor / vendor
  let guest: GateRequest["guest"] | undefined;
  if (type === "visitor") {
    guest = {
      name: r.visitor_name ?? "Unknown visitor",
      contact: r.visitor_phone,
      company: "",
    };
  } else if (type === "vendor") {
    guest = {
      name: extraNotes.contact_name ?? extraNotes.contactName ?? r.vendor_company ?? "Vendor",
      contact: extraNotes.contact_phone ?? extraNotes.contactPhone ?? undefined,
      company: r.vendor_company ?? extraNotes.company ?? "Vendor",
    };
  }

  const date = extraNotes.date ?? extraNotes.arrival_date ?? extraNotes.arrivalDate ?? (r.valid_from ? r.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const timeSlot = extraNotes.time_slot ?? extraNotes.timeSlot ?? (r.valid_from && r.valid_until ? `${r.valid_from.slice(11, 16)} - ${r.valid_until.slice(11, 16)}` : "—");
  const vehicle = extraNotes.vehicle_number ?? extraNotes.vehicle ?? undefined;
  const purpose = r.leave_reason ?? r.visitor_purpose ?? r.vendor_item_description ?? extraNotes.purpose ?? "—";

  return {
    id: r.id,
    type,
    status,
    date,
    timeSlot,
    purpose,
    vehicle,
    createdAt: r.created_at,
    requester,
    guest,
    review: r.decided_at
      ? {
          note: r.rejection_reason ?? (typeof r.notes === "string" && !r.notes.startsWith("{") ? r.notes : undefined),
          by: r.approver_id ? (usersById[r.approver_id]?.name ?? r.approver_id) : undefined,
          at: r.decided_at,
        }
      : undefined,
    checkInAt: undefined,
    checkOutAt: undefined,
    attendance: "scheduled",
  };
}

const DEFAULT_HOSTS: AppUser[] = [
  { id: "h1", name: "Ananya Sharma", department: "Engineering", email: "ananya@adroitxsignet.com", employeeId: "EMP-101", role: "employee", hod: "—", status: "active", createdAt: "2026-01-01" },
  { id: "h2", name: "Rahul Patel", department: "Operations", email: "rahul@adroitxsignet.com", employeeId: "EMP-102", role: "employee", hod: "—", status: "active", createdAt: "2026-01-01" },
  { id: "h3", name: "Priya Singh", department: "Human Resources", email: "priya@adroitxsignet.com", employeeId: "EMP-103", role: "admin", hod: "—", status: "active", createdAt: "2026-01-01" },
  { id: "h4", name: "Vikram Malhotra", department: "Facilities", email: "vikram@adroitxsignet.com", employeeId: "EMP-104", role: "employee", hod: "—", status: "active", createdAt: "2026-01-01" },
  { id: "h5", name: "Aarav Mehta", department: "Security", email: "aarav@adroitxsignet.com", employeeId: "EMP-105", role: "security", hod: "—", status: "active", createdAt: "2026-01-01" },
];

function mapUser(u: ApiUser): AppUser {
  return {
    id: u.id,
    name: u.name,
    department: u.department ?? "—",
    employeeId: u.employee_id ?? u.id,
    hod: "—",
    email: u.email,
    role: backendRoleToUI(u.role) as Role,
    status: u.is_active ? "active" : "invited",
    createdAt: u.created_at,
  };
}

function mapNotification(n: ApiNotification): AppNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    tone: "info",
    createdAt: n.created_at,
    read: n.is_read,
  };
}

function mapGateLog(log: GateLogOut, requestsById: Record<string, GateRequest>): ActivityEntry {
  const req = requestsById[log.request_id];
  return {
    id: log.id,
    requestId: log.request_id,
    kind: log.direction === "in" ? "check_in" : "check_out",
    label: req ? (req.guest?.name ?? req.requester.name) : log.request_id,
    detail: req ? `${req.type} · ${req.guest?.company ?? req.requester.department}` : "—",
    at: log.logged_at,
    actor: "Security",
  };
}

// ---------------------------------------------------------------------------
// Default permissions — RBAC lives on the backend, but the UI permission matrix
// is kept in context for the admin permissions page.
// ---------------------------------------------------------------------------

const DEFAULT_PERMISSIONS: Permission[] = [
  {
    id: "view_dashboard",
    label: "View dashboard",
    description: "Open the role overview with summary metrics.",
    category: "Workspace",
    grants: { admin: true, employee: true, vendor: true, security: true },
  },
  {
    id: "create_requests",
    label: "Create gate pass requests",
    description: "Submit employee exit and visitor pass requests.",
    category: "Requests",
    grants: { admin: true, employee: true, vendor: false, security: false },
  },
  {
    id: "approve_requests",
    label: "Approve / hold / reject requests",
    description: "Act on entries in the unified approval queue.",
    category: "Requests",
    grants: { admin: true, employee: false, vendor: false, security: false },
  },
  {
    id: "schedule_vendor",
    label: "Schedule vendor arrivals",
    description: "Use the public multi-step arrival scheduling form.",
    category: "Requests",
    grants: { admin: true, employee: false, vendor: true, security: false },
  },
  {
    id: "gate_check_in_out",
    label: "Check-in / check-out at the gate",
    description: "Record live entry and exit timestamps.",
    category: "Gate Operations",
    grants: { admin: true, employee: false, vendor: false, security: true },
  },
  {
    id: "view_gate_queue",
    label: "View today's approved queue",
    description: "See HR-approved arrivals scheduled for today.",
    category: "Gate Operations",
    grants: { admin: true, employee: false, vendor: false, security: true },
  },
  {
    id: "manage_users",
    label: "Manage users",
    description: "Add employees, HODs and roles to the directory.",
    category: "Administration",
    grants: { admin: true, employee: false, vendor: false, security: false },
  },
  {
    id: "manage_permissions",
    label: "Edit permission matrix",
    description: "Toggle feature access for each role.",
    category: "Administration",
    grants: { admin: true, employee: false, vendor: false, security: false },
  },
  {
    id: "view_activity_log",
    label: "View activity log",
    description: "Inspect the live gate movement audit trail.",
    category: "Administration",
    grants: { admin: true, employee: false, vendor: false, security: true },
  },
  {
    id: "export_reports",
    label: "Export reports",
    description: "Download CSV snapshots of passes and movements.",
    category: "Administration",
    grants: { admin: true, employee: false, vendor: false, security: false },
  },
];

// ---------------------------------------------------------------------------
// Context shape — matches the old demo context surface
// ---------------------------------------------------------------------------

interface AppContextValue {
  hydrated: boolean;
  role: UIRole;
  setRole: (role: Role) => void; // no-op in live mode (role is fixed)
  currentUser: UserProfile;
  roleHome: string;
  roleLabel: string;
  requests: GateRequest[];
  createRequest: (input: NewRequest) => Promise<GateRequest>;
  reviewRequest: (id: string, status: Exclude<RequestStatus, "pending">, note?: string) => Promise<void>;
  recordGateMovement: (id: string, kind: "check_in" | "check_out") => Promise<void>;
  users: AppUser[];
  addUser: (input: NewUser & { password: string }) => Promise<void>;
  updateUser: (id: string, data: Partial<AppUser> & { password?: string }) => Promise<void>;
  updateUserPassword: (id: string, password: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  permissions: Permission[];
  togglePermission: (featureId: string, role: Role) => void;
  can: (featureId: string) => boolean;
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  activity: ActivityEntry[];
  signOut: () => Promise<void>;
  reloadRequests: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ---------------------------------------------------------------------------
// Role title helper
// ---------------------------------------------------------------------------

function roleTitle(backendRole: string): string {
  const map: Record<string, string> = {
    admin: "Administrator",
    hr: "HR Operations Lead",
    employee: "Employee",
    vendor: "Vendor Coordinator",
    security: "Gate Supervisor · Gate 1",
  };
  return map[backendRole] ?? backendRole;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }: { children: ReactNode }) {
  const { profile, uiRole, signOut: authSignOut } = useAuth();

  const [rawRequests, setRawRequests] = useState<ApiRequest[]>([]);
  const [rawUsers, setRawUsers] = useState<ApiUser[]>([]);
  const [rawNotifications, setRawNotifications] = useState<ApiNotification[]>([]);
  const [rawLogs, setRawLogs] = useState<GateLogOut[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS);
  const [hydrated, setHydrated] = useState(false);
  const bootedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Load all data
  // ---------------------------------------------------------------------------

  const loadAll = useCallback(async () => {
    if (!profile) return;

    const [reqsRes, notifsRes, logsRes] = await Promise.allSettled([
      requestsApi.list(),
      notificationsApi.list(),
      gateApi.logs(),
    ]);

    if (reqsRes.status === "fulfilled") setRawRequests(reqsRes.value);
    if (notifsRes.status === "fulfilled") setRawNotifications(notifsRes.value);
    if (logsRes.status === "fulfilled") setRawLogs(logsRes.value);

    if (profile.role === "admin" || profile.role === "hr") {
      const usrsRes = await usersApi.list().catch(() => [] as ApiUser[]);
      setRawUsers(usrsRes);
    }

    setHydrated(true);
  }, [profile]);

  // Load on first boot and whenever the signed-in user changes (re-login),
  // so a different user never sees the previous user's cached data.
  useEffect(() => {
    if (!profile) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const reloadRequests = useCallback(async () => {
    const reqs = await requestsApi.list().catch(() => [] as ApiRequest[]);
    setRawRequests(reqs);
    const logs = await gateApi.logs().catch(() => [] as GateLogOut[]);
    setRawLogs(logs);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived — map raw API data to frontend types
  // ---------------------------------------------------------------------------

  const usersById = useMemo(() => {
    const m: Record<string, ApiUser> = {};
    rawUsers.forEach((u) => { m[u.id] = u; });
    if (profile) m[profile.id] = profile as ApiUser;
    return m;
  }, [rawUsers, profile]);

  const requests = useMemo<GateRequest[]>(() => {
    const mapped: GateRequest[] = [];
    for (const r of rawRequests) {
      const g = mapRequest(r, usersById);
      if (g) mapped.push(g);
    }
    return mapped;
  }, [rawRequests, usersById]);

  const requestsById = useMemo(() => {
    const m: Record<string, GateRequest> = {};
    requests.forEach((r) => { m[r.id] = r; });
    return m;
  }, [requests]);

  const users = useMemo<AppUser[]>(() => (rawUsers.length > 0 ? rawUsers.map(mapUser) : DEFAULT_HOSTS), [rawUsers]);

  const notifications = useMemo<AppNotification[]>(
    () => rawNotifications.map(mapNotification),
    [rawNotifications],
  );

  const activity = useMemo<ActivityEntry[]>(
    () => rawLogs.map((l) => mapGateLog(l, requestsById)).sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [rawLogs, requestsById],
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const createRequest = useCallback(
    async (input: NewRequest): Promise<GateRequest> => {
      let created: ApiRequest;

      if (input.type === "employee") {
        const leaveType = input.mode === "full_time" ? "full_leave" : "outing";
        created = await requestsApi.createLeave({
          leave_type: leaveType,
          leave_reason: input.purpose,
          notes: JSON.stringify({
            employeeName: input.requester.name,
            employeeEmail: input.requester.email,
            employeeDepartment: input.requester.department,
            employeeHod: input.requester.hod,
            employeeId: input.requester.employeeId,
            date: input.date,
            timeSlot: input.timeSlot,
            expectedReturn: input.expectedReturn,
            mode: input.mode,
            purpose: input.purpose,
          }),
        });
      } else if (input.type === "visitor") {
        created = await requestsApi.createVisitor({
          visitor_name: input.guest?.name ?? "Guest",
          visitor_phone: input.guest?.contact ?? "",
          visitor_purpose: input.purpose,
          notes: JSON.stringify({
            guestCompany: input.guest?.company,
            visitors: input.guest?.visitors,
            date: input.date,
            timeSlot: input.timeSlot,
            hostName: input.requester.name,
            hostEmail: input.requester.email,
            hostDepartment: input.requester.department,
          }),
        });
      } else {
        created = await requestsApi.createVendor({
          vendor_item_direction: "in",
          vendor_item_description: input.purpose,
          vendor_company: input.guest?.company ?? input.guest?.name,
          contact_name: input.requester.name,
          contact_email: input.requester.email,
          contact_phone: input.guest?.contact,
          arrival_date: input.date,
          time_slot: input.timeSlot,
          host_name: input.requester.hod,
          vehicle_number: input.vehicle,
          purpose: input.purpose,
          notes: JSON.stringify({
            contactName: input.requester.name,
            contactEmail: input.requester.email,
            contactPhone: input.guest?.contact,
            arrivalDate: input.date,
            timeSlot: input.timeSlot,
            host: input.requester.hod,
            vehicle: input.vehicle,
            purpose: input.purpose,
            company: input.guest?.company ?? input.guest?.name,
          }),
        });
      }

      setRawRequests((prev) => [created, ...prev]);
      const mapped = mapRequest(created, usersById);
      return mapped!;
    },
    [usersById],
  );

  const reviewRequest = useCallback(
    async (id: string, status: Exclude<RequestStatus, "pending">, note?: string) => {
      let updated: ApiRequest;
      if (status === "approved") {
        updated = await requestsApi.approve(id, note);
      } else if (status === "rejected") {
        updated = await requestsApi.reject(id, note ?? "Rejected");
      } else {
        // "hold" — cancel is the closest backend equivalent
        updated = await requestsApi.cancel(id, note);
      }
      setRawRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [],
  );

  const recordGateMovement = useCallback(
    async (id: string, kind: "check_in" | "check_out") => {
      const log = await gateApi.log({
        request_id: id,
        direction: kind === "check_in" ? "in" : "out",
      });
      setRawLogs((prev) => [...prev, log]);
    },
    [],
  );

  const addUser = useCallback(
    async (input: NewUser & { password: string }) => {
      const created = await usersApi.create({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role,
      });
      setRawUsers((prev) => [created, ...prev]);
    },
    [],
  );

  const updateUser = useCallback(
    async (id: string, input: Partial<AppUser> & { password?: string }) => {
      const payload: {
        name?: string;
        email?: string;
        role?: string;
        is_active?: boolean;
        password?: string;
      } = {};

      if (input.name !== undefined) payload.name = input.name;
      if (input.email !== undefined) payload.email = input.email;
      if (input.role !== undefined) payload.role = input.role;
      if (input.status !== undefined) payload.is_active = input.status === "active";
      if (input.password !== undefined && input.password) payload.password = input.password;

      const updated = await usersApi.update(id, payload);
      setRawUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    },
    [],
  );

  const updateUserPassword = useCallback(async (id: string, password: string) => {
    await usersApi.updatePassword(id, password);
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await usersApi.delete(id);
    setRawUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const togglePermission = useCallback((featureId: string, role: Role) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === featureId
          ? { ...p, grants: { ...p.grants, [role]: !p.grants[role] } }
          : p,
      ),
    );
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setRawNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    notificationsApi.markRead(id).catch(() => null);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setRawNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    notificationsApi.markAllRead().catch(() => null);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
  }, [authSignOut]);

  // ---------------------------------------------------------------------------
  // CurrentUser profile & Role
  // ---------------------------------------------------------------------------

  const effectiveRole: UIRole = profile ? uiRole : "vendor";

  const currentUser = useMemo<UserProfile>(() => {
    if (!profile) {
      return {
        id: "guest",
        name: "Guest / Vendor",
        email: "",
        department: "Vendor Portal",
        hod: "—",
        employeeId: "—",
        role: "vendor",
        title: "Vendor Self-Service",
      };
    }
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      department: profile.department ?? "—",
      hod: "—",
      employeeId: profile.employee_id ?? profile.id,
      role: uiRole as Role,
      title: roleTitle(profile.role),
    };
  }, [profile, uiRole]);

  // ---------------------------------------------------------------------------
  // can() helper — checks UI permission matrix (not backend RBAC)
  // ---------------------------------------------------------------------------

  const can = useCallback(
    (featureId: string) =>
      permissions.find((p) => p.id === featureId)?.grants[effectiveRole] ?? true,
    [permissions, effectiveRole],
  );

  // ---------------------------------------------------------------------------
  // Value
  // ---------------------------------------------------------------------------

  const value = useMemo<AppContextValue>(() => {
    return {
      hydrated,
      role: effectiveRole,
      setRole: () => {}, // no-op — role is fixed by backend account
      currentUser,
      roleHome: ROLE_META[effectiveRole].home,
      roleLabel: ROLE_META[effectiveRole].label,
      requests,
      createRequest,
      reviewRequest,
      recordGateMovement,
      users,
      addUser,
      updateUser,
      updateUserPassword,
      deleteUser,
      permissions,
      togglePermission,
      can,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      activity,
      signOut,
      reloadRequests,
    };
  }, [
    hydrated,
    effectiveRole,
    currentUser,
    requests,
    createRequest,
    reviewRequest,
    recordGateMovement,
    users,
    addUser,
    updateUser,
    updateUserPassword,
    deleteUser,
    permissions,
    togglePermission,
    can,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    activity,
    signOut,
    reloadRequests,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
