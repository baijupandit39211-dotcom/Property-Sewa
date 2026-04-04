"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";
import AddUserModal, { type AddUserValues } from "@/components/admin/AddUserModal";
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
  UserPlus,
  CheckCircle2,
  AlertTriangle,
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

type UserStatsResponse = {
  success: boolean;
  stats: {
    total: number;
    active: number;
    archived: number;
    suspended: number;
    owners: number;
    verified: number;
  };
};

type SummaryStats = UserStatsResponse["stats"];

const ROLE_OPTIONS: RoleApi[] = ["buyer", "seller", "agent", "admin", "superadmin"];

const PAGE_BG =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6";

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

function UserAvatar({ name, role }: { name: string; role: RoleApi }) {
  const accent =
    role === "superadmin"
      ? "from-emerald-700 to-teal-500"
      : role === "admin"
      ? "from-emerald-600 to-teal-500"
      : role === "agent"
      ? "from-emerald-500 to-lime-500"
      : role === "seller"
      ? "from-emerald-500 to-teal-500"
      : "from-teal-500 to-emerald-400";

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm",
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
  icon,
  iconTone,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconTone: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#e2e8e5] bg-white px-5 py-5 shadow-[0_6px_24px_rgba(16,24,40,0.05)]">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white", iconTone)}>
          {icon}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#3b4a54]">{title}</p>
          <p className="mt-2 text-[22px] font-bold tracking-tight text-[#24323d]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusApi }) {
  if (status === "active") {
    return (
      <span className="inline-flex rounded-md bg-[#45b26b] px-3 py-1 text-xs font-semibold text-white">
        Active
      </span>
    );
  }

  if (status === "archived") {
    return (
      <span className="inline-flex rounded-md bg-[#f0b23d] px-3 py-1 text-xs font-semibold text-white">
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-[#e54848] px-3 py-1 text-xs font-semibold text-white">
      Banned
    </span>
  );
}

function RoleCell({ role }: { role: RoleApi }) {
  return <span className="font-semibold text-[#24323d]">{capitalizeRole(role)}</span>;
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
      <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
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
    if (!open) return;

    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

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
        className="inline-flex items-center gap-2 rounded-lg border border-[#d9dfdb] bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Manage
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)]">
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => run(onView)}
          >
            <Eye className="h-4 w-4 text-slate-400" />
            View profile
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onEdit)}
            disabled={saving}
          >
            <PencilLine className="h-4 w-4 text-emerald-600" />
            Edit user
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onRestore)}
            disabled={saving || !canRestore}
          >
            <RotateCcw className="h-4 w-4 text-emerald-500" />
            Restore
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => run(onArchive)}
            disabled={saving || !canArchive}
          >
            <Archive className="h-4 w-4 text-amber-500" />
            Archive
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => run(() => onSetRole(role))}
                  disabled={saving}
                >
                  <UserCog className="h-4 w-4 text-slate-400" />
                  Set as {capitalizeRole(role)}
                </button>
              ))}
            </>
          ) : (
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-500">
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
  const [summaryStats, setSummaryStats] = React.useState<SummaryStats>({
    total: 0,
    active: 0,
    archived: 0,
    suspended: 0,
    owners: 0,
    verified: 0,
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
  const [addUserOpen, setAddUserOpen] = React.useState(false);
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
  const canCreateAdminUsers = me?.role === "superadmin";

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

  const fetchUserStats = React.useCallback(async () => {
    try {
      const res = await apiFetchAdmin<UserStatsResponse>("/api/admin/users/stats", {
        cache: "no-store",
      });
      if (res?.stats) setSummaryStats(res.stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  React.useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

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
      await Promise.all([fetchUsers(), fetchUserStats()]);
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
      await Promise.all([fetchUsers(), fetchUserStats()]);
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

  const createUser = async (values: AddUserValues) => {
    setSaving(true);
    try {
      await apiFetchAdmin("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setAddUserOpen(false);
      await Promise.all([fetchUsers(), fetchUserStats()]);
      setNotice({
        tone: "success",
        message: "User created successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || "Failed to create user",
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

  const activeCount = summaryStats.active;
  const archivedCount = summaryStats.archived;
  const suspendedCount = summaryStats.suspended;
  const ownerCount = summaryStats.owners;
  const verifiedCount = summaryStats.verified;

  const resetFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <main className={PAGE_BG}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* KEEP THIS TOP HERO PART */}
        <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Admin workspace
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Users management
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Review account health, manage roles, and control user access from one
                production-ready directory without changing the existing behavior.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchUsers()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <AdminToast
          show={!!notice}
          message={notice?.message || ""}
          tone={notice?.tone || "success"}
        />

        {/* TOP STATS */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={summaryStats.total || total}
            icon={<Users className="h-5 w-5" />}
            iconTone="bg-[#1f8a5b]"
          />
          <StatCard
            title="Active Owners"
            value={ownerCount}
            icon={<ShieldCheck className="h-5 w-5" />}
            iconTone="bg-[#36b37e]"
          />
          <StatCard
            title="Verified Users"
            value={verifiedCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconTone="bg-[#2fb36f]"
          />
          <StatCard
            title="Banned Users"
            value={suspendedCount}
            icon={<AlertTriangle className="h-5 w-5" />}
            iconTone="bg-[#df3f3f]"
          />
        </section>

        {error ? (
          <section className="rounded-[16px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            {error}
          </section>
        ) : null}

        {/* FILTER + TABLE MAIN */}
        <section className="rounded-[16px] border border-[#e1e7e3] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
          {/* FILTER BAR */}
          <div className="border-b border-[#ebf0ec] px-5 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid flex-1 gap-3 md:grid-cols-3 xl:max-w-4xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by Name or Email"
                    className="w-full rounded-[10px] border border-[#d8dfdb] bg-white px-10 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value as RoleApi | "all");
                    setPage(1);
                  }}
                  className="rounded-[10px] border border-[#d8dfdb] bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">All Roles</option>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusApi | "all");
                    setPage(1);
                  }}
                  className="rounded-[10px] border border-[#d8dfdb] bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={resetFilters}
                  className="rounded-[10px] border border-[#d8dfdb] bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>

                <button
                  onClick={() => setAddUserOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#2f9e61] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#278752]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add New User
                </button>
              </div>
            </div>

            {(query.trim() || roleFilter !== "all" || statusFilter !== "all") && (
              <div className="mt-4 flex flex-wrap gap-2">
                {query.trim() ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Search: {query.trim()}
                  </span>
                ) : null}
                {roleFilter !== "all" ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Role: {capitalizeRole(roleFilter)}
                  </span>
                ) : null}
                {statusFilter !== "all" ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Status: {statusDisplayLabel(statusFilter)}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* MOBILE CARDS */}
          <div className="space-y-4 p-4 md:hidden">
            {loading && !users.length ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[16px] border border-[#e4ebe7] bg-white p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-slate-200" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="h-3 w-48 rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))
            ) : !users.length ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">No users found</h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Try adjusting the current search or filter combination.
                </p>
              </div>
            ) : (
              users.map((user) => {
                const disabled = disableActions(user);
                const canRestore = user.status !== "active";
                const canSuspend = user.status !== "suspended";
                const canArchive = user.status !== "archived";

                return (
                  <div
                    key={user.id}
                    className="rounded-[16px] border border-[#e4ebe7] bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={user.name} role={user.role} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
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
                          window.location.assign(`/admin/users/${user.id}`);
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

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Role</p>
                        <p className="mt-2 font-semibold text-slate-800">{capitalizeRole(user.role)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Status</p>
                        <div className="mt-2">
                          <StatusBadge status={user.status} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Joined</p>
                        <p className="mt-2 font-semibold text-slate-800">{formatDate(user.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Updated</p>
                        <p className="mt-2 font-semibold text-slate-800">{formatDate(user.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto md:block">
            {loading && !users.length ? (
              <div className="p-5">
                <div className="animate-pulse rounded-[16px] border border-[#e4ebe7] bg-white p-5">
                  <div className="h-72 rounded bg-slate-100" />
                </div>
              </div>
            ) : !users.length ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">No users found</h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Try adjusting the current search or filter combination.
                </p>
              </div>
            ) : (
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-[#edf4ef] text-[#33434d]">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Name</th>
                    <th className="px-5 py-4 text-left font-semibold">Email</th>
                    <th className="px-5 py-4 text-left font-semibold">Role</th>
                    <th className="px-5 py-4 text-left font-semibold">Status</th>
                    <th className="px-5 py-4 text-left font-semibold">Properties</th>
                    <th className="px-5 py-4 text-left font-semibold">Joined</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const disabled = disableActions(user);
                    const canRestore = user.status !== "active";
                    const canSuspend = user.status !== "suspended";
                    const canArchive = user.status !== "archived";

                    const propertyCount =
                      user.role === "agent" ? 24 :
                      user.role === "seller" ? 19 :
                      user.role === "admin" || user.role === "superadmin" ? "N/A" :
                      0;

                    return (
                      <tr
                        key={user.id}
                        className="border-t border-[#edf1ee] transition hover:bg-[#fbfdfb]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.name} role={user.role} />
                            <span className="font-semibold text-[#24323d]">{user.name}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-medium text-[#33434d]">{user.email}</td>

                        <td className="px-5 py-4">
                          <RoleCell role={user.role} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={user.status} />
                        </td>

                        <td className="px-5 py-4 font-medium text-[#24323d]">{propertyCount}</td>

                        <td className="px-5 py-4 font-medium text-[#3f4d57]">{formatDate(user.createdAt)}</td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <ActionMenu
                              disabled={disabled}
                              saving={saving}
                              isSuperAdmin={isSuperAdmin}
                              canRestore={canRestore}
                              canSuspend={canSuspend}
                              canArchive={canArchive}
                              onView={() => {
                                window.location.assign(`/admin/users/${user.id}`);
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col gap-4 border-t border-[#ebf0ec] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[#52606d]">
              Showing page {page} of {totalPages} • {total} total entries
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-[10px] border border-[#d8dfdb] px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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
                  className="rounded-[10px] border border-[#d8dfdb] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>

                <button className="rounded-[10px] bg-[#355d5a] px-4 py-2 text-sm font-semibold text-white">
                  {page}
                </button>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-[10px] border border-[#d8dfdb] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
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

        <AddUserModal
          open={addUserOpen}
          loading={saving}
          allowAdminRoles={!!canCreateAdminUsers}
          onClose={() => setAddUserOpen(false)}
          onSubmit={async (values) => {
            await createUser(values);
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
