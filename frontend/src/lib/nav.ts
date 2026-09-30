import {
  ClipboardList,
  Gauge,
  KeyRound,
  LayoutDashboard,
  ScanLine,
  CalendarPlus,
  Inbox,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/approvals", label: "Approval Queue", icon: ClipboardList },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/permissions", label: "Permission Matrix", icon: KeyRound },
  ],
  employee: [
    { href: "/employee", label: "Overview", icon: Gauge },
    { href: "/employee/gate-pass", label: "Gate Pass Request", icon: CalendarPlus },
    { href: "/employee/visitor", label: "Visitor Pass", icon: UserPlus },
    { href: "/employee/requests", label: "My Requests", icon: Inbox },
  ],
  vendor: [
    { href: "/vendor", label: "Vendor Portal", icon: Gauge },
    { href: "/vendor/schedule", label: "Schedule Arrival", icon: CalendarPlus },
  ],
  security: [{ href: "/security", label: "Gate Operations", icon: ScanLine }],
};
