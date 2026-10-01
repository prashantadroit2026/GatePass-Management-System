"use client";

import { Camera, Save, UserPlus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { DEPARTMENTS } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";

interface FormState {
  name: string;
  department: string;
  employeeId: string;
  hod: string;
  email: string;
  password: string;
  photo?: string;
}

const EMPTY: FormState = {
  name: "",
  department: "",
  employeeId: "",
  hod: "",
  email: "",
  password: "",
};

export function AddUserForm() {
  const { addUser, users } = useApp();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large", { description: "Please pick a file under 2 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.department) next.department = "Select a department";
    if (!form.employeeId.trim()) next.employeeId = "Employee ID is required";
    else if (users.some((u) => u.employeeId.toLowerCase() === form.employeeId.trim().toLowerCase()))
      next.employeeId = "This employee ID already exists";
    if (!form.hod.trim()) next.hod = "HOD is required";
    if (!form.email.trim()) next.email = "Work email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email address";
    if (form.password.length < 6) next.password = "Minimum 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Fix the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      await (addUser as (input: { name: string; department: string; employeeId: string; hod: string; email: string; role: string; password: string; photo?: string }) => Promise<void>)({
        name: form.name.trim(),
        department: form.department,
        employeeId: form.employeeId.trim().toUpperCase(),
        hod: form.hod.trim(),
        email: form.email.trim().toLowerCase(),
        role: "employee",
        password: form.password,
        photo: form.photo,
      });
      setForm(EMPTY);
      toast.success("User added", { description: `${form.name.trim()} can now request gate passes.` });
    } catch (err: unknown) {
      toast.error("Failed to add user", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Add new user"
        description="Photo, department, HOD and login credentials"
        actions={<UserPlus className="h-4 w-4 text-indigo-500" aria-hidden />}
      />
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={form.name || "New User"} src={form.photo} size="lg" className="bg-slate-100" />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white ring-2 ring-white">
                <Camera className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <Button variant="outline" size="sm" icon={<Camera className="h-3.5 w-3.5" aria-hidden />} onClick={() => fileRef.current?.click()}>
                Upload photo
              </Button>
              <p className="mt-1.5 text-xs text-slate-500">JPG or PNG · square works best</p>
            </div>
          </div>

          <Field label="Full name" htmlFor="user-name" required error={errors.name}>
            <Input id="user-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ananya Sharma" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" htmlFor="user-dept" required error={errors.department}>
              <Select id="user-dept" value={form.department} onChange={(e) => set("department", e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Employee ID" htmlFor="user-eid" required error={errors.employeeId} hint="e.g. EMP-1509">
              <Input id="user-eid" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} placeholder="EMP-0000" />
            </Field>
          </div>

          <Field label="Reporting HOD" htmlFor="user-hod" required error={errors.hod}>
            <Input id="user-hod" value={form.hod} onChange={(e) => set("hod", e.target.value)} placeholder="e.g. Rajesh Iyer" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Work email" htmlFor="user-email" required error={errors.email}>
              <Input id="user-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@adroitxsignet.com" />
            </Field>
            <Field label="Password" htmlFor="user-password" required error={errors.password} hint="Minimum 6 characters">
              <Input id="user-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••" />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => { setForm(EMPTY); setErrors({}); }} disabled={busy}>
              Clear
            </Button>
            <Button type="submit" loading={busy} icon={<Save className="h-4 w-4" aria-hidden />}>
              Add user
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
