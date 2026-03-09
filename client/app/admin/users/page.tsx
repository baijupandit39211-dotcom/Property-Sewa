"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";
import AdminUserEditorModal, {
  type AdminUserEditorValues,
} from "@/components/admin/AdminUserEditorModal";
import AdminToast from "@/components/admin/AdminToast";
import {
  Ban,
  Archive,
  Eye,
  Filter,
  MoreHorizontal,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

type RoleApi = "buyer" | "seller" | "agent" | "admin" | "superadmin";
type StatusApi = "active" | "archived" | "suspended";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  bio?: string;
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
  stats?: {
    total: number;
    active: number;
    archived: number;
    suspended: number;
  };
};

type MeResponse = {
  success: boolean;
  user: { _id: string; role: RoleApi; name?: string };
};

const ROLE_OPTIONS: RoleApi[] = ["buyer", "seller", "agent", "admin", "superadmin"];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function capitalizeRole(role: RoleApi) {
  if (role === "superadmin") return "SuperAdmin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function statusDisplayLabel(status: StatusApi) {
  if (status === "archived") return "Archived";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean).slice(0, 2);
  if (!parts.length) return "NA";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function RolePill({ role }: { role: RoleApi }) {
  const tone =
    role === "buyer"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : role === "seller"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : role === "agent"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : role === "admin"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>
      {capitalizeRole(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusApi }) {
  const tone =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "archived"
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  const dot =
    status === "active"
      ? "bg-emerald-500"
      : status === "archived"
      ? "bg-slate-400"
      : "bg-rose-500";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        tone
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {statusDisplayLabel(status)}
    </span>
  );
}

function UserAvatar({ name, role }: { name: string; role: RoleApi }) {
  const accent =
    role === "superadmin"
      ? "from-emerald-600 to-teal-500"
      : role === "admin"
      ? "from-violet-600 to-fuchsia-500"
      : role === "agent"
      ? "from-amber-500 to-orange-500"
      : role === "seller"
      ? "from-indigo-500 to-blue-500"
      : "from-sky-500 to-cyan-500";

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white shadow-sm",
        accent
      )}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[28px] border p-5 shadow-sm", tone)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-3 text-white">{icon}</div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  description,
  confirmText,
  danger,
  loading,
  onClose,
  onConfirm,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-2xl px-4 py-2 text-sm font-semibold text-white",
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800",
              loading && "opacity-70"
            )}
          >
            {loading ? "Working..." : confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({
  disabled,
  saving,
  isSuperAdmin,
  onView,
  canRestore,
  canSuspend,
  canArchive,
  onEdit,
  onRestore,
  onArchive,
  onSuspend,
  onSetRole,
}: {
  disabled: boolean;
  saving: boolean;
  isSuperAdmin: boolean;
  onView: () => void;
  canRestore: boolean;
  canSuspend: boolean;
  canArchive: boolean;
  onEdit: () => void;
  onRestore: () => void;
  onArchive: () => void;
  onSuspend: () => void;
  onSetRole?: (role: RoleApi) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => {
          if (!disabled) setOpen((value) => !value);
        }}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Manage
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)]">
          <button
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => run(onView)}
          >
            <Eye className="h-4 w-4 text-slate-400" />
            View profile
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onEdit)}
            disabled={saving}
          >
            <PencilLine className="h-4 w-4 text-sky-500" />
            Edit user
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onRestore)}
            disabled={saving || !canRestore}
          >
            <RotateCcw className="h-4 w-4 text-emerald-500" />
            Restore
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onArchive)}
            disabled={saving || !canArchive}
          >
            <Archive className="h-4 w-4 text-amber-500" />
            Archive
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onSuspend)}
            disabled={saving || !canSuspend}
          >
            <Ban className="h-4 w-4 text-rose-500" />
            Suspend
          </button>
          <div className="my-2 h-px bg-slate-200" />
          {onSetRole ? (
            <>
              <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Change role
              </div>
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => run(() => onSetRole(role))}
                  disabled={saving}
                >
                  <UserCog className="h-4 w-4 text-slate-400" />
                  Set as {capitalizeRole(role)}
                </button>
              ))}
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">
              {isSuperAdmin
                ? "Role changes are unavailable for this user."
                : "Role changes require SuperAdmin access."}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    archived: 0,
    suspended: 0,
  });
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleApi | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusApi | "all">("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<{ id: string; role: RoleApi } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editorUser, setEditorUser] = React.useState<UserRow | null>(null);
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const [confirm, setConfirm] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    danger?: boolean;
    confirmText?: string;
    action?: () => Promise<void>;
  }>({ open: false, title: "" });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const isSuperAdmin = me?.role === "superadmin";

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

      const items = (res.items || []).map((user: any) => ({
        id: String(user._id || user.id),
        name: user.name || "N/A",
        email: user.email || "N/A",
        phone: user.phone || "",
        address: user.address || "",
        company: user.company || "",
        bio: user.bio || "",
        role: (user.role || "buyer") as RoleApi,
        status: ((user.status || "active") === "inactive"
          ? "archived"
          : user.status || "active") as StatusApi,
        createdAt: user.createdAt || "",
        updatedAt: user.updatedAt,
      }));

      setUsers(items);
      setTotal(res.total || items.length);
      setStats(
        res.stats || {
          total: res.total || items.length,
          active: items.filter((user: UserRow) => user.status === "active").length,
          archived: items.filter((user: UserRow) => user.status === "archived").length,
          suspended: items.filter((user: UserRow) => user.status === "suspended").length,
        }
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [limit, page, query, roleFilter, statusFilter]);

  React.useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  React.useEffect(() => {
    if (!notice) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setNotice(null);
    }, 2800);

    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [notice]);

  const changeStatus = async (id: string, status: StatusApi) => {
    setSaving(true);
    try {
      await apiFetchAdmin(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchUsers();
      setNotice({
        tone: "success",
        message:
          status === "active"
            ? "User restored successfully."
            : status === "archived"
            ? "User archived successfully."
            : "User suspended successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || "Failed to update status",
      });
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
      setNotice({
        tone: "success",
        message: `User role updated to ${capitalizeRole(role)}.`,
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || "Failed to update role",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, values: AdminUserEditorValues) => {
    setSaving(true);
    try {
      await apiFetchAdmin(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      await fetchUsers();
      setEditorUser(null);
      setNotice({
        tone: "success",
        message: "User profile updated successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || "Failed to update user",
      });
    } finally {
      setSaving(false);
    }
  };

  const disableActions = (row: UserRow) => {
    if (!me) return false;
    if (row.id === me.id) return true;
    if (me.role === "admin" && row.role === "superadmin") return true;
    return false;
  };

  const activeCount = stats.active;
  const archivedCount = stats.archived;
  const suspendedCount = stats.suspended;
  const resetFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_45%,#ecfdf5_100%)] px-6 py-7 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.85)] sm:px-8 sm:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Admin workspace
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Users management
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Review account health, manage roles, and control user access from one
                production-ready directory without changing the existing behavior.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                Live snapshot
              </p>
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-3xl font-bold text-white">{stats.total || total}</p>
                  <p className="text-sm text-slate-200">Total accounts in the admin directory</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      In view
                    </p>
                    <p className="mt-2 text-xl font-bold text-white">{users.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Page
                    </p>
                    <p className="mt-2 text-xl font-bold text-white">
                      {page}/{totalPages}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total users"
            value={stats.total || total}
            detail="Total accounts matching the current search scope."
            tone="border-slate-200 bg-white"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Active in view"
            value={activeCount}
            detail="Accounts currently able to use the platform."
            tone="border-emerald-100 bg-emerald-50/80"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <StatCard
            title="Archived"
            value={archivedCount}
            detail="Accounts removed from the active working set."
            tone="border-amber-100 bg-amber-50/80"
            icon={<Archive className="h-5 w-5" />}
          />
          <StatCard
            title="Suspended in view"
            value={suspendedCount}
            detail="Accounts restricted for policy or abuse reasons."
            tone="border-rose-100 bg-rose-50/80"
            icon={<ShieldOff className="h-5 w-5" />}
          />
        </section>

        <AdminToast
          show={!!notice}
          message={notice?.message || ""}
          tone={notice?.tone || "success"}
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Directory filters</p>
                    <p className="text-sm text-slate-500">
                      Search users and narrow the current admin view by role or account state.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => fetchUsers()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                    <button
                      onClick={() => alert("In production: open invite/create user dialog")}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      <UserCog className="h-4 w-4" />
                      Invite user
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {query.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setPage(1);
                      }}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                    >
                      Search: {query.trim()} x
                    </button>
                  ) : null}
                  {roleFilter !== "all" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRoleFilter("all");
                        setPage(1);
                      }}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                    >
                      Role: {capitalizeRole(roleFilter)} x
                    </button>
                  ) : null}
                  {statusFilter !== "all" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setPage(1);
                      }}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                    >
                      Status: {statusDisplayLabel(statusFilter)} x
                    </button>
                  ) : null}
                  {!query.trim() && roleFilter === "all" && statusFilter === "all" ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      <Filter className="h-3.5 w-3.5" />
                      No filters applied
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_150px]">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Search
                  </span>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search by name or email"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Role
                  </span>
                  <select
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value as RoleApi | "all");
                      setPage(1);
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="all">All roles</option>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as StatusApi | "all");
                      setPage(1);
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </section>

            {error ? (
              <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
                {error}
              </section>
            ) : null}

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">User directory</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {users.length} users on this page out of {total} total records.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Users className="h-3.5 w-3.5" />
                  {limit} per page
                </div>
              </div>

              {loading && !users.length ? (
                <div className="space-y-4 bg-slate-50/70 p-5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse rounded-[24px] border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-slate-200" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 rounded bg-slate-200" />
                          <div className="h-3 w-48 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !users.length ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">No users found</h3>
                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    Try adjusting the current search or filter combination to bring matching users
                    back into the list.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 bg-slate-50/70 p-4 md:hidden">
                    {users.map((user) => {
                      const disabled = disableActions(user);
                      const canRestore = user.status !== "active";
                      const canSuspend = user.status !== "suspended";
                      const canArchive = user.status !== "archived";

                      return (
                        <div
                          key={user.id}
                          className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar name={user.name} role={user.role} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {user.name}
                                </p>
                                <p className="truncate text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>

                            <ActionMenu
                              disabled={disabled}
                              saving={saving}
                              isSuperAdmin={isSuperAdmin}
                              canRestore={canRestore}
                              canSuspend={canSuspend}
                              canArchive={canArchive}
                              onView={() => {
                                window.location.href = `/admin/users/${user.id}`;
                              }}
                              onEdit={() => setEditorUser(user)}
                              onRestore={() =>
                                setConfirm({
                                  open: true,
                                  title: "Restore user?",
                                  description: "The account will be returned to active status.",
                                  confirmText: "Restore",
                                  action: () => changeStatus(user.id, "active"),
                                })
                              }
                              onArchive={() =>
                                setConfirm({
                                  open: true,
                                  title: "Archive user?",
                                  description: "Archived users are removed from the active working set.",
                                  confirmText: "Archive",
                                  danger: true,
                                  action: () => changeStatus(user.id, "archived"),
                                })
                              }
                              onSuspend={() =>
                                setConfirm({
                                  open: true,
                                  title: "Suspend user?",
                                  description: "Use this for fraud or spam. Access can be restored later.",
                                  confirmText: "Suspend",
                                  danger: true,
                                  action: () => changeStatus(user.id, "suspended"),
                                })
                              }
                              onSetRole={
                                isSuperAdmin
                                  ? (role) =>
                                      setConfirm({
                                        open: true,
                                        title: `Set role to ${capitalizeRole(role)}?`,
                                        confirmText: "Change role",
                                        action: () => changeRole(user.id, role),
                                      })
                                  : undefined
                              }
                            />
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <RolePill role={user.role} />
                            <StatusBadge status={user.status} />
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Created
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-800">
                                {formatDate(user.createdAt)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Updated
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-800">
                                {formatDate(user.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[980px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-5 py-4 text-left font-semibold">User</th>
                          <th className="px-5 py-4 text-left font-semibold">Role</th>
                          <th className="px-5 py-4 text-left font-semibold">Status</th>
                          <th className="px-5 py-4 text-left font-semibold">Created</th>
                          <th className="px-5 py-4 text-left font-semibold">Updated</th>
                          <th className="px-5 py-4 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => {
                          const disabled = disableActions(user);
                          const canRestore = user.status !== "active";
                          const canSuspend = user.status !== "suspended";
                          const canArchive = user.status !== "archived";

                          return (
                            <tr
                              key={user.id}
                              className="border-t border-slate-200 transition hover:bg-slate-50/70"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar name={user.name} role={user.role} />
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">
                                      {user.name}
                                    </p>
                                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <RolePill role={user.role} />
                              </td>
                              <td className="px-5 py-4">
                                <StatusBadge status={user.status} />
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {formatDate(user.createdAt)}
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {formatDate(user.updatedAt)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <ActionMenu
                                  disabled={disabled}
                                  saving={saving}
                                  isSuperAdmin={isSuperAdmin}
                                  canRestore={canRestore}
                                  canSuspend={canSuspend}
                                  canArchive={canArchive}
                                  onView={() => {
                                    window.location.href = `/admin/users/${user.id}`;
                                  }}
                                  onEdit={() => setEditorUser(user)}
                                  onRestore={() =>
                                    setConfirm({
                                      open: true,
                                      title: "Restore user?",
                                      description: "The account will be returned to active status.",
                                      confirmText: "Restore",
                                      action: () => changeStatus(user.id, "active"),
                                    })
                                  }
                                  onArchive={() =>
                                    setConfirm({
                                      open: true,
                                      title: "Archive user?",
                                      description:
                                        "Archived users are removed from the active working set.",
                                      confirmText: "Archive",
                                      danger: true,
                                      action: () => changeStatus(user.id, "archived"),
                                    })
                                  }
                                  onSuspend={() =>
                                    setConfirm({
                                      open: true,
                                      title: "Suspend user?",
                                      description:
                                        "Use this for fraud or spam. Access can be restored later.",
                                      confirmText: "Suspend",
                                      danger: true,
                                      action: () => changeStatus(user.id, "suspended"),
                                    })
                                  }
                                  onSetRole={
                                    isSuperAdmin
                                      ? (role) =>
                                          setConfirm({
                                            open: true,
                                            title: `Set role to ${capitalizeRole(role)}?`,
                                            confirmText: "Change role",
                                            action: () => changeRole(user.id, role),
                                          })
                                      : undefined
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Page {page} of {totalPages}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Total users: {total}. Adjust the page size if you need a wider review window.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  {[10, 20, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value} / page
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Role distribution</h2>
              <p className="mt-1 text-sm text-slate-500">Counts within the current result set.</p>
              <div className="mt-5 space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <RolePill role={role} />
                    <span className="text-sm font-bold text-slate-900">
                      {users.filter((user) => user.role === role).length}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Admin guardrails</h2>
              <p className="mt-1 text-sm text-slate-500">
                The existing backend permission checks are unchanged.
              </p>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  You cannot change your own account from this page.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Admin users cannot modify SuperAdmin accounts.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  Role changes remain limited to SuperAdmin users.
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Status health</h2>
              <p className="mt-1 text-sm text-slate-500">
                Live counts across the current search and role scope.
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <span className="text-sm font-semibold text-emerald-900">Active</span>
                  <span className="text-base font-bold text-emerald-900">{activeCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <span className="text-sm font-semibold text-amber-900">Archived</span>
                  <span className="text-base font-bold text-amber-900">{archivedCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                  <span className="text-sm font-semibold text-rose-900">Suspended</span>
                  <span className="text-base font-bold text-rose-900">{suspendedCount}</span>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <AdminUserEditorModal
          open={!!editorUser}
          loading={saving}
          initialValues={{
            name: editorUser?.name || "",
            email: editorUser?.email || "",
            phone: editorUser?.phone || "",
            address: editorUser?.address || "",
            company: editorUser?.company || "",
            bio: editorUser?.bio || "",
          }}
          onClose={() => setEditorUser(null)}
          onSubmit={async (values) => {
            if (!editorUser) return;
            await updateUser(editorUser.id, values);
          }}
        />

        <Modal
          open={confirm.open}
          title={confirm.title}
          description={confirm.description}
          confirmText={confirm.confirmText}
          danger={confirm.danger}
          loading={saving}
          onClose={() => setConfirm({ open: false, title: "" })}
          onConfirm={async () => {
            if (!confirm.action) return;
            await confirm.action();
            setConfirm({ open: false, title: "" });
          }}
        />
      </div>
    </main>
  );
}
