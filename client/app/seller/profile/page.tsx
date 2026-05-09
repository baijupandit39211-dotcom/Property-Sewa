"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { logoutUser } from "@/app/lib/auth";

type MeResponse = {
  success?: boolean;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    phone?: string;
    address?: string;
    company?: string;
    bio?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  message?: string;
};

type Tab = "profile" | "activity";

function Badge({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "slate" }) {
  const map =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${map}`}>
      {children}
    </span>
  );
}

const formatDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
};

export default function SellerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("profile");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    company: "",
    bio: "",
  });
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch<MeResponse>("/auth/me");
        if (res?.success === false || !res?.user) {
          throw new Error(res?.message || "Failed to load profile");
        }
        setUser(res.user);
        setForm({
          name: res.user?.name || "",
          phone: res.user?.phone || "",
          address: res.user?.address || "",
          company: res.user?.company || "",
          bio: res.user?.bio || "",
        });
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initials = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
            Seller profile
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-white">Profile</h1>
          <p className="mt-3 text-sm text-emerald-50/90">Manage your seller information.</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/seller/seller-dashboard")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-700/60 hover:bg-emerald-800"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading profile...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {user && !loading && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-xl font-extrabold text-emerald-800 ring-1 ring-emerald-200">
                  {initials}
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900">{user.name || "Unnamed"}</div>
                  <div className="text-sm text-slate-600">{user.email}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="emerald">Seller</Badge>
                    <Badge tone={user.status === "active" ? "emerald" : "slate"}>{user.status || "active"}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2 border-b pb-3 text-sm font-semibold text-slate-700">
              <button
                onClick={() => setTab("profile")}
                className={tab === "profile" ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-800" : "rounded-full bg-slate-100 px-3 py-1 text-slate-700"}
              >
                Profile
              </button>
              <button
                onClick={() => setTab("activity")}
                className={tab === "activity" ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-800" : "rounded-full bg-slate-100 px-3 py-1 text-slate-700"}
              >
                Activity
              </button>
            </div>

            {tab === "profile" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" value={user.name} />
                <Field label="Email" value={user.email} />
                <Field label="Role" value={user.role} />
                <Field label="Status" value={user.status} />
                <Field label="Phone" value={user.phone} />
                <Field label="Address" value={user.address} />
                <Field label="Company / Agency" value={user.company} />
                <Field label="Bio" value={user.bio} multiline />
                <Field label="Created At" value={formatDate(user.createdAt)} />
                <Field label="Updated At" value={formatDate(user.updatedAt)} />
              </div>
            )}

            {tab === "activity" && (
              <div className="mt-4 text-sm text-slate-700">
                <div>Last login: Not available</div>
                <div className="mt-1 text-xs text-slate-500">
                  Connect audit/activity endpoint to display detailed logs here.
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Edit Profile</h3>
            <p className="mt-2 text-sm text-slate-600">Update your contact details.</p>
            <div className="mt-4 grid gap-3">
              <LabeledInput
                label="Name"
                value={form.name}
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
              />
              <LabeledInput label="Email (read-only)" value={user?.email} readOnly />
              <LabeledInput
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
              />
              <LabeledInput
                label="Address"
                value={form.address}
                onChange={(v) => setForm((p) => ({ ...p, address: v }))}
              />
              <LabeledInput
                label="Company / Agency"
                value={form.company}
                onChange={(v) => setForm((p) => ({ ...p, company: v }))}
              />
              <LabeledTextArea
                label="Bio"
                value={form.bio}
                onChange={(v) => setForm((p) => ({ ...p, bio: v }))}
              />
            </div>
            {saveError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {saveSuccess}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  setSaveError("");
                  setSaveSuccess("");
                  setSaving(true);
                  try {
                    const res = await apiFetch<{ success?: boolean; user?: any; message?: string }>(
                      "/users/me",
                      {
                        method: "PATCH",
                        body: JSON.stringify({
                          name: form.name,
                          phone: form.phone,
                          address: form.address,
                          company: form.company,
                          bio: form.bio,
                        }),
                      }
                    );
                    if (res?.success) {
                      setUser(res.user || user);
                      setSaveSuccess("Profile updated successfully.");
                      setForm({
                        name: res.user?.name || form.name,
                        phone: res.user?.phone || form.phone,
                        address: res.user?.address || form.address,
                        company: res.user?.company || form.company,
                        bio: res.user?.bio || form.bio,
                      });
                    } else {
                      setSaveError(res?.message || "Failed to update profile.");
                    }
                  } catch (e: any) {
                    setSaveError(e?.message || "Failed to update profile.");
                    if (String(e?.message || "").toLowerCase().includes("unauth")) {
                      await logoutUser();
                      router.replace("/login");
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-700/60 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  if (!value) value = "—";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold text-slate-900", multiline && "whitespace-pre-wrap")}>{value}</div>
    </div>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        value={value || ""}
        readOnly
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
      />
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-800",
          readOnly
            ? "border-slate-200 bg-slate-50"
            : "border-slate-200 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        )}
      />
    </div>
  );
}

function LabeledTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}

// simple cn helper
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
