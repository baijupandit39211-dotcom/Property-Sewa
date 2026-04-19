"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetchAdmin } from "@/app/lib/api";
import AdminUserEditorModal from "@/components/admin/AdminUserEditorModal";
import AdminToast from "@/components/admin/AdminToast";
import {
  Archive,
  ArrowLeft,
  Ban,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserCog,
} from "lucide-react";

type RoleApi = "buyer" | "seller" | "agent" | "admin" | "superadmin";
type StatusApi = "active" | "archived" | "suspended" | "inactive";

type UserDetail = {
  _id: string;
  name?: string;
  email?: string;
  avatar?: string;
  provider?: string;
  role?: RoleApi;
  status?: StatusApi;
  phone?: string;
  address?: string;
  company?: string;
  bio?: string;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type MeResponse = {
  success: boolean;
  user: { _id: string; role: RoleApi; name?: string };
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function capitalizeRole(role?: string) {
  if (!role) return "N/A";
  if (role === "superadmin") return "SuperAdmin";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatStatus(status?: StatusApi) {
  if (!status) return "N/A";
  if (status === "archived") return "Archived";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatProvider(provider?: string) {
  if (!provider) return "N/A";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function RolePill({ role }: { role?: RoleApi }) {
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

  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>{capitalizeRole(role)}</span>;
}

function StatusBadge({ status }: { status?: StatusApi }) {
  const safeStatus = status || "active";
  const tone =
    safeStatus === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : safeStatus === "archived"
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>{formatStatus(safeStatus)}</span>;
}

function ConfirmModal({
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
          <button onClick={onClose} disabled={loading} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={cn("rounded-2xl px-4 py-2 text-sm font-semibold text-white", danger ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800", loading && "opacity-70")}>{loading ? "Working..." : confirmText || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [user, setUser] = React.useState<UserDetail | null>(null);
  const [me, setMe] = React.useState<{ id: string; role: RoleApi } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const toastTimer = React.useRef<number | null>(null);
  const [confirm, setConfirm] = React.useState<{ open: boolean; title: string; description?: string; confirmText?: string; danger?: boolean; action?: () => Promise<void> }>({ open: false, title: "" });

  const isSuperAdmin = me?.role === "superadmin";
  const disableActions = !user || !me || user._id === me.id || (me.role === "admin" && user.role === "superadmin");

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const [meRes, userRes] = await Promise.all([
        apiFetchAdmin<MeResponse>("/auth/admin/me"),
        apiFetchAdmin<{ success: boolean; user: UserDetail }>(`/api/admin/users/${userId}`),
      ]);
      if (meRes?.user?._id) setMe({ id: meRes.user._id, role: meRes.user.role });
      setUser({
        ...userRes.user,
        status:
          (userRes.user.status || "active") === "inactive"
            ? "archived"
            : (userRes.user.status || "active"),
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    load();
  }, [load]);

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

  const patchUser = async (path: string, body: Record<string, unknown>) => {
    if (!userId) return;
    setSaving(true);
    try {
      await apiFetchAdmin(path, { method: "PATCH", body: JSON.stringify(body) });
      await load();
      if (body.status === "active") {
        setNotice({ tone: "success", message: "User restored successfully." });
      } else if (body.status === "archived") {
        setNotice({ tone: "success", message: "User archived successfully." });
      } else if (body.status === "suspended") {
        setNotice({ tone: "success", message: "User suspended successfully." });
      } else if (typeof body.role === "string") {
        setNotice({
          tone: "success",
          message: `User role updated to ${capitalizeRole(body.role)}.`,
        });
      }
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (values: {
    name: string;
    email: string;
    phone: string;
    address: string;
    company: string;
    bio: string;
  }) => {
    if (!userId) return;
    setSaving(true);
    try {
      await apiFetchAdmin(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      await load();
      setEditorOpen(false);
      setNotice({ tone: "success", message: "User profile updated successfully." });
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminToast
          show={!!notice}
          message={notice?.message || ""}
          tone={notice?.tone || "success"}
        />

        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#14532d_45%,#ecfdf5_100%)] px-6 py-7 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.85)] sm:px-8 sm:py-9">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to users
              </Link>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">User profile</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">Inspect account details and run the same moderation actions from a dedicated profile screen.</p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Account snapshot</p>
              <div className="mt-3 flex flex-wrap gap-2">{user ? <><RolePill role={user.role} /><StatusBadge status={user.status} /></> : null}</div>
            </div>
          </div>
        </section>

        {error ? <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">{error}</section> : null}

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-48 rounded bg-slate-200" />
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="h-40 rounded-[24px] bg-slate-100" />
                <div className="h-40 rounded-[24px] bg-slate-100 lg:col-span-2" />
              </div>
            </div>
          </section>
        ) : user ? (
          <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col items-start gap-4">
                  {user.avatar ? <img src={user.avatar} alt={user.name || "User"} className="h-20 w-20 rounded-[24px] object-cover ring-4 ring-emerald-50" /> : <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-600 to-teal-500 text-2xl font-bold text-white">{(user.name || "NA").slice(0, 2).toUpperCase()}</div>}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{user.name || "Unnamed user"}</h2>
                    <p className="mt-1 text-sm text-slate-500">{user.email || "No email provided"}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><RolePill role={user.role} /><StatusBadge status={user.status} /></div>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><Mail className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-semibold text-slate-900">Email</p><p>{user.email || "N/A"}</p></div></div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><Phone className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-semibold text-slate-900">Phone</p><p>{user.phone || "N/A"}</p></div></div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-semibold text-slate-900">Address</p><p>{user.address || "N/A"}</p></div></div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><Building2 className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-semibold text-slate-900">Company</p><p>{user.company || "N/A"}</p></div></div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-600">Member since</p><p className="mt-2 text-xl font-bold text-slate-900">{formatDate(user.createdAt)}</p></div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-600">Last updated</p><p className="mt-2 text-xl font-bold text-slate-900">{formatDate(user.updatedAt)}</p></div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-600">Provider</p><p className="mt-2 text-xl font-bold text-slate-900">{formatProvider(user.provider)}</p></div>
              </div>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
                    <p className="mt-1 text-sm text-slate-500">These controls use the same admin rules as the manage menu.</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <button disabled={disableActions || saving} onClick={() => setEditorOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 disabled:opacity-50"><PencilLine className="h-4 w-4" />Edit</button>
                  <button disabled={disableActions || saving || user.status === "active"} onClick={() => setConfirm({ open: true, title: "Restore user?", description: "The account will be returned to active status.", confirmText: "Restore", action: () => patchUser(`/api/admin/users/${user._id}/status`, { status: "active" }) })} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Restore</button>
                  <button disabled={disableActions || saving || user.status === "archived"} onClick={() => setConfirm({ open: true, title: "Archive user?", description: "Archived users are removed from the active working set.", confirmText: "Archive", danger: true, action: () => patchUser(`/api/admin/users/${user._id}/status`, { status: "archived" }) })} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 disabled:opacity-50"><Archive className="h-4 w-4" />Archive</button>
                  <button disabled={disableActions || saving || user.status === "suspended"} onClick={() => setConfirm({ open: true, title: "Suspend user?", description: "Use this for fraud or spam. Access can be restored later.", confirmText: "Suspend", danger: true, action: () => patchUser(`/api/admin/users/${user._id}/status`, { status: "suspended" }) })} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50"><Ban className="h-4 w-4" />Suspend</button>
                </div>
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />Role management</div>
                  <p className="mt-1 text-sm text-slate-500">Only SuperAdmin can change roles. Existing self and SuperAdmin protections are preserved.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(["buyer", "seller", "agent", "admin", "superadmin"] as RoleApi[]).map((role) => (
                      <button key={role} disabled={!isSuperAdmin || disableActions || saving} onClick={() => setConfirm({ open: true, title: `Set role to ${capitalizeRole(role)}?`, confirmText: "Change role", action: () => patchUser(`/api/admin/users/${user._id}/role`, { role }) })} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"><UserCog className="h-4 w-4" />Set as {capitalizeRole(role)}</button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Profile notes</h3>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarDays className="h-4 w-4 text-slate-500" />Timeline</div>
                    <p className="mt-3 text-sm text-slate-600">Created: {formatDate(user.createdAt)}</p>
                    <p className="mt-2 text-sm text-slate-600">Updated: {formatDate(user.updatedAt)}</p>
                    {user.archivedAt ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Archived: {formatDate(user.archivedAt)}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldOff className="h-4 w-4 text-slate-500" />Bio</div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{user.bio || "No profile bio has been added for this account yet."}</p>
                  </div>
                </div>
              </section>
            </div>
          </section>
        ) : null}

        <AdminUserEditorModal
          open={editorOpen && !!user}
          loading={saving}
          initialValues={{
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            address: user?.address || "",
            company: user?.company || "",
            bio: user?.bio || "",
          }}
          onClose={() => setEditorOpen(false)}
          onSubmit={updateUser}
        />

        <ConfirmModal open={confirm.open} title={confirm.title} description={confirm.description} confirmText={confirm.confirmText} danger={confirm.danger} loading={saving} onClose={() => setConfirm({ open: false, title: "" })} onConfirm={async () => { if (!confirm.action) return; await confirm.action(); setConfirm({ open: false, title: "" }); }} />
      </div>
    </main>
  );
}
