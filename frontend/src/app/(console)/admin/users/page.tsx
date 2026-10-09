"use client";

import {
  Users as UsersIcon,
  Pencil,
  KeyRound,
  Trash2,
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  FileText,
  Upload,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useRef } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { DEPARTMENTS, ROLE_META } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AddUserForm } from "@/components/admin/add-user-form";
import { useSimulatedLoad } from "@/hooks/use-app";
import type { AppUser, Role } from "@/types";
import { useApi } from "@/lib/api";

export default function UsersPage() {
  const { users, currentUser, updateUser, updateUserPassword, deleteUser } = useApp();
  const loading = useSimulatedLoad();
  const [query, setQuery] = useState("");

  // Modal states
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AppUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);
  const [importingUser, setImportingUser] = useState<boolean>(false);

  // Edit User Form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("employee");
  const [editDepartment, setEditDepartment] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "invited">("active");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  // Change Password Form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Delete User state
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.employeeId, u.department, u.email, u.hod].join(" ").toLowerCase().includes(q),
    );
  }, [users, query]);

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditDepartment(user.department === "—" ? "" : user.department);
    setEditStatus(user.status);
    setEditPassword("");
    setShowEditPassword(false);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (editPassword && editPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setEditBusy(true);
    try {
      await updateUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        department: editDepartment || "—",
        status: editStatus,
        password: editPassword || undefined,
      });
      toast.success("User updated", { description: `${editName.trim()} was successfully updated.` });
      setEditingUser(null);
    } catch (err: unknown) {
      toast.error("Failed to update user", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setEditBusy(false);
    }
  };

  const openPasswordModal = (user: AppUser) => {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPasswordBusy(true);
    try {
      await updateUserPassword(passwordUser.id, newPassword);
      toast.success("Password changed", {
        description: `Password for ${passwordUser.name} has been reset.`,
      });
      setPasswordUser(null);
    } catch (err: unknown) {
      toast.error("Failed to change password", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setDeleteBusy(true);
    try {
      await deleteUser(deletingUser.id);
      toast.success("User deleted", {
        description: `${deletingUser.name} was removed from the system.`,
      });
      setDeletingUser(null);
    } catch (err: unknown) {
      toast.error("Failed to delete user", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleImportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) {
      toast.error("Please select an Excel file");
      return;
    }
    setImportingUser(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await supabase.from("users").insert([]);
      toast.error("Import temporarily disabled", {
        description: "Use individual user creation until Excel import library is configured",
      });
    } catch (err: unknown) {
      toast.error("Import failed", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setImportingUser(false);
    }
  };

  const columns: Column<AppUser>[] = [
    {
      key: "name",
      header: "User",
      hideOnMobile: true,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.photo} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{u.name}</p>
            <p className="truncate text-xs text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "employeeId",
      header: "Employee ID",
      cell: (u) => <span className="font-mono text-xs">{u.employeeId}</span>,
    },
    { key: "department", header: "Department", cell: (u) => u.department },
    { key: "hod", header: "HOD", cell: (u) => <span className="text-slate-600">{u.hod}</span> },
    {
      key: "role",
      header: "Role",
      cell: (u) => (
        <Badge tone={u.role === "admin" ? "indigo" : u.role === "security" ? "slate" : "sky"}>
          {ROLE_META[u.role]?.short ?? u.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge tone={u.status === "active" ? "emerald" : "amber"} dot>
          {u.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      hideOnMobile: true,
      cell: (u) => {
        const isSelf = u.id === currentUser.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => openEditModal(u)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              title="Edit user details"
              aria-label={`Edit ${u.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openPasswordModal(u)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-amber-600"
              title="Change user password"
              aria-label={`Change password for ${u.name}`}
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeletingUser(u)}
              disabled={isSelf}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              title={isSelf ? "Cannot delete own account" : "Delete user"}
              aria-label={`Delete ${u.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin / HR"
        title="User Management"
        description="Add, edit credentials, reset passwords, and manage access permissions for all users."
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <AddUserForm />
          <ImportUsersModal />
        </div>

        <div className="xl:col-span-8">
          <Card>
            <CardHeader
              title="Directory"
              description={`${users.length} users registered`}
              actions={
                <div className="w-full sm:w-64">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, ID, department…"
                    aria-label="Search users"
                  />
                </div>
              }
            />
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(u) => u.id}
              loading={loading}
              cardTitle={(u) => (
                <span className="flex items-center gap-2">
                  <Avatar name={u.name} src={u.photo} size="sm" />
                  {u.name}
                </span>
              )}
              cardSubtitle={(u) => `${u.employeeId} · ${u.email}`}
              cardActions={(u) => (
                <div className="flex w-full items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => openEditModal(u)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                    onClick={() => openPasswordModal(u)}
                  >
                    Password
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={u.id === currentUser.id}
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => setDeletingUser(u)}
                  >
                    Delete
                  </Button>
                </div>
              )}
              empty={
                <EmptyState
                  icon={<UsersIcon className="h-6 w-6" aria-hidden />}
                  title="No users found"
                  description="Try a different name, employee ID or department."
                />
              }
            />
          </Card>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => !editBusy && setEditingUser(null)}
        title="Edit User"
        description="Update user profile details, role, and active status."
        size="md"
      >
        {editingUser && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Field label="Full Name" htmlFor="edit-name" required>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full Name"
                required
              />
            </Field>

            <Field label="Email Address" htmlFor="edit-email" required>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role" htmlFor="edit-role" required>
                <Select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin / HR</option>
                  <option value="security">Security</option>
                  <option value="vendor">Vendor</option>
                </Select>
              </Field>

              <Field label="Department" htmlFor="edit-dept">
                <Select
                  id="edit-dept"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Account Status" htmlFor="edit-status" required>
              <Select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "active" | "invited")}
              >
                <option value="active">Active</option>
                <option value="invited">Inactive / Suspended</option>
              </Select>
            </Field>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label
                htmlFor="edit-password"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Change Password (optional)
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Leave blank to keep current password unchanged.
              </p>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={showEditPassword ? "Hide password" : "Show password"}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={editBusy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={editBusy}
                icon={<Save className="h-4 w-4" aria-hidden />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
        {/* Import Users Modal */}
        <Modal
          open={importingUser}
          onClose={() => setImportingUser(false)}
          title="Import Users from Excel"
          size="lg"
        >
          {importingUser && (
            <form onSubmit={handleImportSubmit} className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  className="block cursor-pointer px-4 py-2 border border-slate-300 rounded-md shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                <span className="text-sm text-slate-500">
                  Select xlsx or xls file with columns: name, email, password, role
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Employee IDs will be assigned automatically from the admin side.
              </p>
              <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setImportingUser(false)}
                  disabled={importBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={importBusy}
                  icon={<Save className="h-4 w-4" aria-hidden />}
                >
                  Import Users
                </Button>
              </div>
            </form>
          )}
        </Modal>
</div>

      <div className="xl:col-span-8">
      <Modal
        open={Boolean(passwordUser)}
        onClose={() => !passwordBusy && setPasswordUser(null)}
        title="Change Password"
        description={`Set a new password for ${passwordUser?.name || "user"}.`}
        size="sm"
      >
        {passwordUser && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field label="New Password" htmlFor="modal-new-password" required hint="Minimum 6 characters">
              <div className="relative">
                <Input
                  id="modal-new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirm Password" htmlFor="modal-confirm-password" required>
              <Input
                id="modal-confirm-password"
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => setPasswordUser(null)}
                disabled={passwordBusy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="warning"
                loading={passwordBusy}
                icon={<KeyRound className="h-4 w-4" aria-hidden />}
              >
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        open={Boolean(deletingUser)}
        onClose={() => !deleteBusy && setDeletingUser(null)}
        title="Delete User"
        size="sm"
      >
        {deletingUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-rose-100 bg-rose-50/70 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="text-xs text-rose-800">
                <p className="font-semibold">Permanent Deletion</p>
                <p className="mt-0.5 text-rose-700">
                  This will remove the user account from the directory and revoke authentication access immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-50 p-3">
              <Avatar name={deletingUser.name} src={deletingUser.photo} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{deletingUser.name}</p>
                <p className="truncate text-xs text-slate-500">{deletingUser.email}</p>
                <span className="mt-1 inline-block text-[11px] font-medium text-slate-600">
                  Role: {ROLE_META[deletingUser.role]?.short ?? deletingUser.role}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deleteBusy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                loading={deleteBusy}
                icon={<Trash2 className="h-4 w-4" aria-hidden />}
                onClick={handleDeleteSubmit}
              >
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
