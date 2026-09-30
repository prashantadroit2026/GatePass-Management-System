"use client";

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
import { createInitialState, type AppState } from "@/data/mock-data";
import { REQUEST_TYPE_META, ROLE_META } from "@/lib/constants";
import { BootSplash } from "@/components/layout/boot-splash";
import type {
  ActivityEntry,
  AppNotification,
  AppUser,
  GateRequest,
  NewRequest,
  NewUser,
  Permission,
  RequestStatus,
  Role,
  UserProfile,
} from "@/types";

const STORAGE_KEY = "gatepass.state.v1";

const PROFILE_TITLES: Record<Role, string> = {
  admin: "HR Operations Lead",
  employee: "Senior Software Engineer",
  vendor: "Vendor Coordinator",
  security: "Gate Supervisor · Gate 1",
};

const BASE_PROFILES: Record<
  Role,
  Pick<UserProfile, "name" | "email" | "department" | "hod" | "employeeId">
> = {
  admin: {
    name: "Priya Menon",
    email: "priya.menon@acmeindustries.com",
    department: "Human Resources",
    hod: "COO Office",
    employeeId: "EMP-1001",
  },
  employee: {
    name: "Ananya Sharma",
    email: "ananya.sharma@acmeindustries.com",
    department: "Engineering",
    hod: "Rajesh Iyer",
    employeeId: "EMP-1042",
  },
  vendor: {
    name: "Rahul Verma",
    email: "rahul.verma@sterlingfacilities.com",
    department: "Sterling Facilities Pvt Ltd",
    hod: "—",
    employeeId: "VND-0114",
  },
  security: {
    name: "Vikram Singh",
    email: "vikram.singh@acmeindustries.com",
    department: "Security",
    hod: "Imran Sheikh",
    employeeId: "EMP-1205",
  },
};

function isStoredState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<AppState>;
  return (
    typeof s.role === "string" &&
    Array.isArray(s.requests) &&
    Array.isArray(s.users) &&
    Array.isArray(s.permissions) &&
    Array.isArray(s.notifications) &&
    Array.isArray(s.activity)
  );
}

function readStored(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isStoredState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function nextRequestId(existing: GateRequest[], type: GateRequest["type"]): string {
  const { prefix } = REQUEST_TYPE_META[type];
  const year = new Date().getFullYear();
  const seeds: Record<string, number> = { GP: 1000, VIS: 3300, VND: 8890 };
  const numbers = existing
    .filter((r) => r.id.startsWith(`${prefix}-${year}-`))
    .map((r) => Number.parseInt(r.id.split("-")[2] ?? "", 10))
    .filter((n) => Number.isFinite(n));
  const next = (numbers.length ? Math.max(...numbers) : seeds[prefix]) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

function makeNotification(
  title: string,
  message: string,
  tone: AppNotification["tone"],
): AppNotification {
  return {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    message,
    tone,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

interface AppContextValue {
  hydrated: boolean;
  role: Role;
  setRole: (role: Role) => void;
  currentUser: UserProfile;
  roleHome: string;
  roleLabel: string;
  requests: GateRequest[];
  createRequest: (input: NewRequest) => GateRequest;
  reviewRequest: (id: string, status: Exclude<RequestStatus, "pending">, note?: string) => void;
  recordGateMovement: (id: string, kind: "check_in" | "check_out") => void;
  users: AppUser[];
  addUser: (input: NewUser) => void;
  permissions: Permission[];
  togglePermission: (featureId: string, role: Role) => void;
  can: (featureId: string) => boolean;
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  activity: ActivityEntry[];
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    setState(readStored() ?? createInitialState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !state) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — the demo keeps working in memory */
    }
  }, [hydrated, state]);

  const setRole = useCallback((role: Role) => {
    setState((prev) => (prev ? { ...prev, role } : prev));
  }, []);

  const createRequest = useCallback(
    (input: NewRequest): GateRequest => {
      const now = new Date().toISOString();
      const created: GateRequest = {
        ...input,
        id: nextRequestId(state?.requests ?? [], input.type),
        status: "pending",
        attendance: "scheduled",
        createdAt: now,
      };
      setState((prev) =>
        prev
          ? {
              ...prev,
              requests: [created, ...prev.requests],
              notifications: [
                makeNotification(
                  "Request submitted",
                  `${created.id} · ${REQUEST_TYPE_META[input.type].label} is awaiting approval.`,
                  "info",
                ),
                ...prev.notifications,
              ],
            }
          : prev,
      );
      return created;
    },
    [state],
  );

  const reviewRequest = useCallback(
    (id: string, status: Exclude<RequestStatus, "pending">, note?: string) => {
      const target = state?.requests.find((r) => r.id === id);
      if (!target) return;
      const at = new Date().toISOString();
      const by = BASE_PROFILES[state?.role ?? "admin"].name;
      const tone: AppNotification["tone"] =
        status === "approved" ? "success" : status === "hold" ? "warning" : "danger";
      const word = status === "approved" ? "approved" : status === "hold" ? "placed on hold" : "rejected";
      setState((prev) =>
        prev
          ? {
              ...prev,
              requests: prev.requests.map((r) =>
                r.id === id ? { ...r, status, review: { note: note?.trim() || undefined, by, at } } : r,
              ),
              notifications: [
                makeNotification(
                  `Request ${word}`,
                  `${id} was ${word} by ${by}.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
                  tone,
                ),
                ...prev.notifications,
              ],
            }
          : prev,
      );
    },
    [state],
  );

  const recordGateMovement = useCallback(
    (id: string, kind: "check_in" | "check_out") => {
      const target = state?.requests.find((r) => r.id === id);
      if (!target) return;
      const at = new Date().toISOString();
      const actor = BASE_PROFILES[state?.role ?? "security"].name;
      const entry: ActivityEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId: id,
        kind,
        label: target.guest?.name ?? target.requester.name,
        detail: `${REQUEST_TYPE_META[target.type].label} · ${target.guest?.company ?? target.requester.department}`,
        at,
        actor,
      };
      setState((prev) =>
        prev
          ? {
              ...prev,
              requests: prev.requests.map((r) => {
                if (r.id !== id) return r;
                if (kind === "check_in") {
                  return { ...r, checkInAt: at, checkOutAt: r.checkOutAt ?? null, attendance: "on_premises" };
                }
                return { ...r, checkOutAt: at, attendance: "departed" };
              }),
              activity: [...prev.activity, entry],
              notifications: [
                makeNotification(
                  kind === "check_in" ? "Entry recorded" : "Exit recorded",
                  `${id} · ${entry.label} ${kind === "check_in" ? "checked in" : "checked out"} at ${new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
                  "info",
                ),
                ...prev.notifications,
              ],
            }
          : prev,
      );
    },
    [state],
  );

  const addUser = useCallback(
    (input: NewUser) => {
      const user: AppUser = {
        ...input,
        id: `usr_${Date.now()}`,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      setState((prev) =>
        prev
          ? {
              ...prev,
              users: [user, ...prev.users],
              notifications: [
                makeNotification(
                  "User added",
                  `${user.name} (${user.employeeId}) joined the directory.`,
                  "success",
                ),
                ...prev.notifications,
              ],
            }
          : prev,
      );
    },
    [],
  );

  const togglePermission = useCallback((featureId: string, role: Role) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            permissions: prev.permissions.map((p) =>
              p.id === featureId ? { ...p, grants: { ...p.grants, [role]: !p.grants[role] } } : p,
            ),
          }
        : prev,
    );
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) =>
      prev
        ? { ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }
        : prev,
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) =>
      prev ? { ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) } : prev,
    );
  }, []);

  const resetDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(createInitialState());
  }, []);

  const value = useMemo<AppContextValue | null>(() => {
    if (!state) return null;
    const currentUser: UserProfile = {
      ...BASE_PROFILES[state.role],
      role: state.role,
      title: PROFILE_TITLES[state.role],
    };
    return {
      hydrated,
      role: state.role,
      setRole,
      currentUser,
      roleHome: ROLE_META[state.role].home,
      roleLabel: ROLE_META[state.role].label,
      requests: state.requests,
      createRequest,
      reviewRequest,
      recordGateMovement,
      users: state.users,
      addUser,
      permissions: state.permissions,
      togglePermission,
      can: (featureId: string) =>
        state.permissions.find((p) => p.id === featureId)?.grants[state.role] ?? true,
      notifications: state.notifications,
      unreadCount: state.notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllNotificationsRead,
      activity: state.activity,
      resetDemo,
    };
  }, [
    state,
    hydrated,
    setRole,
    createRequest,
    reviewRequest,
    recordGateMovement,
    addUser,
    togglePermission,
    markNotificationRead,
    markAllNotificationsRead,
    resetDemo,
  ]);

  // During SSR (and the very first client frame) there is no state yet — render the
  // splash instead of the tree so consumers never see a null context.
  if (!value) return <BootSplash />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
