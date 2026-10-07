"use client";

import { ArrowRight, CalendarPlus, CheckCircle2, Clock, Search, UserCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { RETURN_TIMES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import type { EmployeeRef, GateRequest, PassMode } from "@/types";

interface LookupState {
  profile: EmployeeRef | null;
  error?: string;
}

export function GatePassForm() {
  const { users, createRequest, currentUser, can } = useApp();
  const allowed = can("create_requests");

  const defaultId = currentUser?.employeeId && currentUser.employeeId !== "—"
    ? currentUser.employeeId
    : "EMP-1001";

  const [employeeId, setEmployeeId] = useState(defaultId);
  const [lookup, setLookup] = useState<LookupState>({
    profile: {
      name: currentUser?.name || "Employee",
      email: currentUser?.email || "",
      department: currentUser?.department && currentUser.department !== "—" ? currentUser.department : "Engineering",
      hod: currentUser?.hod && currentUser.hod !== "—" ? currentUser.hod : "Department Head",
      employeeId: defaultId,
    },
  });
  const [mode, setMode] = useState<PassMode>("full_time");
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("17:00");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<GateRequest | null>(null);

  useEffect(() => {
    const id = employeeId.trim().toUpperCase();
    if (!id) {
      if (currentUser?.name) {
        setLookup({
          profile: {
            name: currentUser.name,
            email: currentUser.email,
            department: currentUser.department && currentUser.department !== "—" ? currentUser.department : "General",
            hod: currentUser.hod && currentUser.hod !== "—" ? currentUser.hod : "—",
            employeeId: currentUser.employeeId || "EMP-1001",
          },
        });
      } else {
        setLookup({ profile: null, error: "Enter your employee ID" });
      }
      return;
    }

    // 1. Search in directory
    const match = users.find(
      (u) =>
        u.employeeId.toUpperCase() === id ||
        u.id.toUpperCase() === id ||
        u.email.toLowerCase() === employeeId.trim().toLowerCase(),
    );

    if (match) {
      setLookup({
        profile: {
          name: match.name,
          email: match.email,
          department: match.department && match.department !== "—" ? match.department : "General",
          hod: match.hod && match.hod !== "—" ? match.hod : "—",
          employeeId: match.employeeId || id,
        },
      });
    } else {
      // Use logged in user's profile with the specified ID
      setLookup({
        profile: {
          name: currentUser?.name || "Employee",
          email: currentUser?.email || "",
          department: currentUser?.department && currentUser.department !== "—" ? currentUser.department : "General",
          hod: currentUser?.hod && currentUser.hod !== "—" ? currentUser.hod : "—",
          employeeId: id,
        },
      });
    }
  }, [employeeId, users, currentUser]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!employeeId.trim()) next.employeeId = "Enter an employee ID";
    if (!date) next.date = "Choose a date";
    else if (date < todayISO()) next.date = "Date cannot be in the past";
    if (reason.trim().length < 5) next.reason = "Describe the reason in at least 5 characters";
    if (mode === "half_time" && !expectedReturn) next.expectedReturn = "Select an expected return time";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    const requesterProfile: EmployeeRef = lookup.profile || {
      name: currentUser.name || "Employee",
      email: currentUser.email || "",
      department: currentUser.department || "General",
      hod: currentUser.hod || "—",
      employeeId: employeeId.trim().toUpperCase(),
    };

    setBusy(true);
    try {
      const createdRequest = await createRequest({
        type: "employee",
        mode,
        date,
        timeSlot: mode === "half_time" ? "Half day (Outing)" : "Full day (Leave)",
        expectedReturn: mode === "half_time" ? expectedReturn : undefined,
        purpose: reason.trim(),
        requester: requesterProfile,
      });
      setCreated(createdRequest);
      setReason("");
      toast.success(`Gate pass submitted successfully`, {
        description: "Your pass is pending approval — track its status under My Requests.",
      });
    } catch (err: unknown) {
      toast.error("Failed to submit request", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Request submitted</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pass <span className="font-mono font-semibold text-slate-900">{created.id}</span> is pending approval
            for {created.date}.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/employee/requests">
              <Button icon={<ArrowRight className="h-4 w-4" aria-hidden />}>Track my requests</Button>
            </Link>
            <Button variant="outline" onClick={() => setCreated(null)}>
              Create another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Employee gate pass"
        description="Enter or confirm your employee details to generate an exit gate pass"
        actions={<CalendarPlus className="h-4 w-4 text-indigo-500" aria-hidden />}
      />
      <CardContent>
        {!allowed ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Creating requests is disabled for your role in the permission matrix.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field
            label="Employee ID"
            htmlFor="emp-id"
            required
            error={errors.employeeId ?? lookup.error}
            hint="Enter your company Employee ID (e.g. EMP-1042)"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="emp-id"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-0000"
                  className="pl-9 font-mono uppercase"
                />
              </div>
              <Button
                variant="outline"
                size="md"
                icon={<UserCheck className="h-4 w-4 text-indigo-600" />}
                onClick={() => setEmployeeId(defaultId)}
              >
                My ID
              </Button>
            </div>
          </Field>

          <div className="grid gap-4 rounded-xl border border-border bg-slate-50 p-4 sm:grid-cols-3">
            <Readonly label="Requester Name" value={lookup.profile?.name} />
            <Readonly label="Department" value={lookup.profile?.department} />
            <Readonly label="Reporting HOD" value={lookup.profile?.hod} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="field-label">Pass type</p>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "full_time", label: "Full Day Leave" },
                  { value: "half_time", label: "Temporary Outing" },
                ]}
              />
            </div>

            <Field label="Date" htmlFor="gp-date" required error={errors.date}>
              <Input
                id="gp-date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>

          {mode === "half_time" ? (
            <Field
              label="Expected return time"
              htmlFor="gp-return"
              required
              error={errors.expectedReturn}
              hint="Security will mark the pass as departed until you return"
            >
              <div className="relative">
                <Clock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Select
                  id="gp-return"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                  className="pl-9"
                >
                  {RETURN_TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Full day pass covers the entire work schedule — no return time required today.
            </p>
          )}

          <Field label="Reason for Gate Pass" htmlFor="gp-reason" required error={errors.reason}>
            <Textarea
              id="gp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Official client meeting downtown / Medical appointment"
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setReason("");
                setErrors({});
              }}
              disabled={busy}
            >
              Clear
            </Button>
            <Button
              type="submit"
              loading={busy}
              disabled={!allowed}
              icon={<CalendarPlus className="h-4 w-4" aria-hidden />}
            >
              Submit Gate Pass
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Readonly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${value ? "text-slate-900" : "text-slate-400"}`}>
        {value ?? "Awaiting employee ID"}
      </p>
    </div>
  );
}
