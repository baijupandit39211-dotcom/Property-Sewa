"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";

type RoleApi = "buyer" | "seller" | "agent" | "admin" | "superadmin";
type StatusApi = "active" | "inactive" | "suspended";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: RoleApi;
  status: StatusApi;
  createdAt: string;
  updatedAt?: string;
};

type ListResponse = {
  success: boolean;
  items: any[];
  total: number;
  page: number;
  limit: number;
};

type MeResponse = { success: boolean; user: { _id: string; role: RoleApi; name?: string } };

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function capitalizeRole(r: RoleApi) {
  return r === "superadmin"
    ? "SuperAdmin"
    : r === "admin"
    ? "Admin"
    : r === "agent"
    ? "Agent"
    : r === "seller"
    ? "Seller"
    : "Buyer";
}

function formatDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function Badge({ status }: { status: StatusApi }) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "inactive"
      ? "bg-zinc-100 text-zinc-800 border-zinc-200"
      : "bg-red-100 text-red-800 border-red-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        styles
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "active"
            ? "bg-emerald-600"
            : status === "inactive"
            ? "bg-zinc-500"
            : "bg-red-600"
        )}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RolePill({ role }: { role: RoleApi }) {
  const map: Record<RoleApi, string> = {
    buyer: "bg-blue-50 text-blue-700 border-blue-200",
    seller: "bg-indigo-50 text-indigo-700 border-indigo-200",
    agent: "bg-amber-50 text-amber-800 border-amber-200",
    admin: "bg-purple-50 text-purple-700 border-purple-200",
    superadmin: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", map[role])}>
      {capitalizeRole(role)}
    </span>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-700">{title}</div>
      <div className="mt-2 text-3xl font-extrabold text-zinc-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}

function Modal({
  open,
  title,
  description,
  confirmText = "Confirm",
  danger,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
          {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-3 border-t p-4">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700",
              loading && "opacity-70"
            )}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleApi | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusApi | "all">("all");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [me, setMe] = React.useState<{ id: string; role: RoleApi } | null>(null);

  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    danger?: boolean;
    confirmText?: string;
    action?: () => Promise<void>;
  }>({ open: false, title: "" });
  const [saving, setSaving] = React.useState(false);

  const isSuperAdmin = me?.role === "superadmin";

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchMe = React.useCallback(async () => {
    try {
      const res = await apiFetchAdmin<MeResponse>("/auth/admin/me");
      if (res?.user?._id) {
        setMe({ id: res.user._id, role: (res.user.role || "admin") as RoleApi });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (query.trim()) params.set("search", query.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await apiFetchAdmin<ListResponse>(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });

      const items = (res.items || []).map((u: any) => ({
        id: String(u._id || u.id),
        name: u.name || "—",
        email: u.email || "—",
        role: (u.role || "buyer") as RoleApi,
        status: (u.status || "active") as StatusApi,
        createdAt: u.createdAt || "",
        updatedAt: u.updatedAt,
      }));

      setUsers(items);
      setTotal(res.total || items.length);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, limit, query, roleFilter, statusFilter]);

  React.useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeStatus = async (id: string, status: StatusApi) => {
    setSaving(true);
    try {
      await apiFetchAdmin(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchUsers();
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id: string, role: RoleApi) => {
    setSaving(true);
    try {
      await apiFetchAdmin(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await fetchUsers();
    } catch (err: any) {
      alert(err?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const disableActions = (row: UserRow) => {
    // If we don't yet know who we are, allow UI; backend will still enforce auth/role.
    if (!me) return false;
    if (row.id === me.id) return true; // cannot act on self
    if (me.role === "admin" && row.role === "superadmin") return true; // admin cannot touch superadmin
    return false;
  };

  const filteredCount = users.length; // after backend filters; list already filtered

  const totalActive = users.filter((u) => u.status === "active").length;
  const totalInactive = users.filter((u) => u.status === "inactive").length;
  const totalSuspended = users.filter((u) => u.status === "suspended").length;

  return (
    <div className="space-y-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-1">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 shadow-sm">
            Admin • Users
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">Users Management</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage buyers, sellers, agents, and admins. Control access, roles, and status.
          </p>
        </div>

        <button
          className="w-full sm:w-auto rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-700/60 transition hover:bg-emerald-800"
          onClick={() => alert("In production: open invite/create user dialog")}
        >
          + Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={total} />
        <StatCard title="Active" value={totalActive} hint="Can login & use platform" />
        <StatCard title="Inactive" value={totalInactive} hint="Disabled by admin" />
        <StatCard title="Suspended" value={totalSuspended} hint="Policy violation / fraud" />
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-lg shadow-slate-200/40 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_160px]">
          <div>
            <label className="text-xs font-semibold text-slate-600">Search</label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="superadmin">SuperAdmin</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">
            Showing <span className="font-extrabold text-slate-900">{filteredCount}</span> users
          </div>
          <div className="text-xs text-slate-500">
            Page {page} / {totalPages} • {limit} per page
          </div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-emerald-50 text-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => {
                  const disable = disableActions(u);
                  return (
                    <tr key={u.id} className="border-t hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <RolePill role={u.role} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={u.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(u.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block">
                          <ActionMenu
                            disabled={disable}
                            isSuperAdmin={isSuperAdmin}
                            saving={saving}
                            onView={() => (window.location.href = `/admin/users/${u.id}`)}
                            onActivate={() =>
                              setConfirm({
                                open: true,
                                title: "Activate user?",
                                confirmText: "Activate",
                                action: () => changeStatus(u.id, "active"),
                              })
                            }
                            onDeactivate={() =>
                              setConfirm({
                                open: true,
                                title: "Deactivate user?",
                                description: "User will be unable to login.",
                                confirmText: "Deactivate",
                                danger: true,
                                action: () => changeStatus(u.id, "inactive"),
                              })
                            }
                            onSuspend={() =>
                              setConfirm({
                                open: true,
                                title: "Suspend user?",
                                description: "Use for fraud/spam. Can be restored later.",
                                confirmText: "Suspend",
                                danger: true,
                                action: () => changeStatus(u.id, "suspended"),
                              })
                            }
                            onSetRole={
                              isSuperAdmin
                                ? (role) =>
                                    setConfirm({
                                      open: true,
                                      title: `Set role to ${capitalizeRole(role)}?`,
                                      confirmText: "Change Role",
                                      action: () => changeRole(u.id, role),
                                    })
                                : undefined
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && !loading && !error && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={7}>
                      No users found. Try changing search or filters.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
        <div className="text-sm text-slate-600">
          Page {page} of {totalPages} • {total} total users
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Confirm modal */}
      <Modal
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        danger={confirm.danger}
        confirmText={confirm.confirmText}
        loading={saving}
        onClose={() => setConfirm({ open: false, title: "" })}
        onConfirm={async () => {
          if (!confirm.action) return;
          await confirm.action();
          setConfirm({ open: false, title: "" });
        }}
      />
    </div>
  );
}

function ActionMenu({
  disabled,
  isSuperAdmin,
  saving,
  onView,
  onActivate,
  onDeactivate,
  onSuspend,
  onSetRole,
}: {
  disabled: boolean;
  isSuperAdmin: boolean;
  saving: boolean;
  onView: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onSuspend: () => void;
  onSetRole?: (role: RoleApi) => void;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onDoc() {
      setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const roleOptions: RoleApi[] = ["buyer", "seller", "agent", "admin", "superadmin"];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((p) => !p);
        }}
        disabled={disabled}
        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        ⋮
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-xl"
        >
          <button className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50" onClick={onView}>
            View profile
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
            onClick={() => {
              setOpen(false);
              onActivate();
            }}
            disabled={saving}
          >
            Activate
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
            onClick={() => {
              setOpen(false);
              onDeactivate();
            }}
            disabled={saving}
          >
            Deactivate
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
            onClick={() => {
              setOpen(false);
              onSuspend();
            }}
            disabled={saving}
          >
            Suspend
          </button>

          {onSetRole && (
            <>
              <div className="h-px bg-zinc-100" />
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500">Change Role</div>
              {roleOptions.map((r) => (
                <button
                  key={r}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                  onClick={() => {
                    setOpen(false);
                    onSetRole(r);
                  }}
                  disabled={saving}
                >
                  Set as {capitalizeRole(r)}
                </button>
              ))}
            </>
          )}

          {!onSetRole && (
            <div className="px-4 py-2 text-xs text-zinc-500">Role changes require SuperAdmin</div>
          )}
        </div>
      )}
    </div>
  );
}
