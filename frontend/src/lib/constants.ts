import type { RequestType, Role } from "@/types";

export const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Operations",
  "Sales",
  "Marketing",
  "Information Technology",
  "Facilities",
  "Security",
];

export const TIME_SLOTS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
];

export const RETURN_TIMES = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

export const ROLE_META: Record<
  Role,
  { label: string; short: string; description: string; home: string; area: string }
> = {
  admin: {
    label: "Admin / HR",
    short: "Admin",
    description: "Approvals, users & permissions",
    home: "/admin",
    area: "admin",
  },
  employee: {
    label: "Employee",
    short: "Employee",
    description: "Request gate & visitor passes",
    home: "/employee",
    area: "employee",
  },
  vendor: {
    label: "Vendor",
    short: "Vendor",
    description: "Public arrival self-service",
    home: "/vendor",
    area: "vendor",
  },
  security: {
    label: "Security Guard",
    short: "Security",
    description: "Gate check-in / check-out",
    home: "/security",
    area: "security",
  },
};

export const REQUEST_TYPE_META: Record<RequestType, { label: string; short: string; prefix: string }> = {
  employee: { label: "Employee Exit", short: "Employee", prefix: "GP" },
  visitor: { label: "Visitor Arrival", short: "Visitor", prefix: "VIS" },
  vendor: { label: "Vendor Arrival", short: "Vendor", prefix: "VND" },
};

export const ORG_NAME = "Acme Industries";
export const APP_NAME = "GatePass";
