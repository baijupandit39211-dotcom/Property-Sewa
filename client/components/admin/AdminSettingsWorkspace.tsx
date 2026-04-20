"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";
import { typography } from "@/app/lib/typography";
import AdminToast from "@/components/admin/AdminToast";
import {
  BellRing,
  Building2,
  Clock3,
  Globe2,
  LockKeyhole,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCog,
} from "lucide-react";

type AdminProfile = {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  bio: string;
  role: string;
  provider: string;
  createdAt?: string;
};

type PlatformSettings = {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  supportAddress: string;
  contactHours: string;
  defaultCurrency: string;
  defaultLocale: string;
  homepageHeadline: string;
};

type OperationsSettings = {
  featuredListingFee: number;
  reportReviewSlaHours: number;
  newListingReviewRequired: boolean;
  allowBuyerReporting: boolean;
  allowGoogleLogin: boolean;
  maintenanceMode: boolean;
};

type NotificationSettings = {
  emailOnNewReport: boolean;
  emailOnNewListing: boolean;
  emailOnNewUser: boolean;
  dailyDigest: boolean;
  digestHour: number;
  productAnnouncements: boolean;
};

type SettingsResponse = {
  success: boolean;
  profile: AdminProfile;
  settings: {
    platform: PlatformSettings;
    operations: OperationsSettings;
    notifications: NotificationSettings;
    updatedAt?: string;
  };
};

const EMPTY_PROFILE: AdminProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  company: "",
  bio: "",
  role: "admin",
  provider: "local",
};

const EMPTY_PLATFORM: PlatformSettings = {
  platformName: "Property Sewa",
  supportEmail: "support@propertysewa.com",
  supportPhone: "",
  supportAddress: "",
  contactHours: "Sun - Fri, 9:00 AM - 6:00 PM",
  defaultCurrency: "NPR",
  defaultLocale: "en-NP",
  homepageHeadline: "Find verified homes, rooms, and land across Nepal.",
};

const EMPTY_OPERATIONS: OperationsSettings = {
  featuredListingFee: 0,
  reportReviewSlaHours: 24,
  newListingReviewRequired: true,
  allowBuyerReporting: true,
  allowGoogleLogin: true,
  maintenanceMode: false,
};

const EMPTY_NOTIFICATIONS: NotificationSettings = {
  emailOnNewReport: true,
  emailOnNewListing: true,
  emailOnNewUser: false,
  dailyDigest: true,
  digestHour: 9,
  productAnnouncements: false,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function serialize(value: unknown) {
  return JSON.stringify(value);
}

function label(value: string) {
  if (!value) return "N/A";
  if (value.toLowerCase() === "superadmin") return "SuperAdmin";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function profileScore(profile: AdminProfile) {
  const fields = [
    profile.name,
    profile.email,
    profile.phone,
    profile.address,
    profile.company,
    profile.bio,
  ];
  return Math.round((fields.filter((value) => String(value || "").trim()).length / 6) * 100);
}

function enabledAlerts(settings: NotificationSettings) {
  return [
    settings.emailOnNewReport,
    settings.emailOnNewListing,
    settings.emailOnNewUser,
    settings.dailyDigest,
    settings.productAnnouncements,
  ].filter(Boolean).length;
}

function Shell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-emerald-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={typography.sectionTitle}>{title}</h2>
          <p className={`mt-1 max-w-2xl ${typography.pageSubtitle}`}>{description}</p>
        </div>
        {action}
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

function Stat({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[28px] border p-5 shadow-sm", tone)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={typography.cardTitle}>{title}</p>
          <p className={`mt-2 ${typography.statValue}`}>{value}</p>
          <p className={`mt-2 ${typography.helperText}`}>{detail}</p>
        </div>
        <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white">{icon}</div>
      </div>
    </div>
  );
}

function Field({
  label: title,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className={`mb-2 block ${typography.cardTitle}`}>{title}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function Area({
  label: title,
  value,
  onChange,
  rows = 3,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className={`mb-2 block ${typography.cardTitle}`}>{title}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4">
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className={`mt-1 ${typography.pageSubtitle}`}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-1 inline-flex h-8 w-14 shrink-0 rounded-full transition",
          checked ? "bg-emerald-600" : "bg-emerald-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition",
            checked ? "left-7" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsWorkspace() {
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<
    "profile" | "platform" | "notifications" | "security" | null
  >(null);

  const [profile, setProfile] = React.useState(EMPTY_PROFILE);
  const [profileBaseline, setProfileBaseline] = React.useState(EMPTY_PROFILE);
  const [platform, setPlatform] = React.useState(EMPTY_PLATFORM);
  const [platformBaseline, setPlatformBaseline] = React.useState(EMPTY_PLATFORM);
  const [operations, setOperations] = React.useState(EMPTY_OPERATIONS);
  const [operationsBaseline, setOperationsBaseline] = React.useState(EMPTY_OPERATIONS);
  const [notifications, setNotifications] = React.useState(EMPTY_NOTIFICATIONS);
  const [notificationsBaseline, setNotificationsBaseline] =
    React.useState(EMPTY_NOTIFICATIONS);
  const [updatedAt, setUpdatedAt] = React.useState("");
  const [passwords, setPasswords] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const timer = React.useRef<number | null>(null);

  const profileDirty = serialize(profile) !== serialize(profileBaseline);
  const platformDirty =
    serialize(platform) !== serialize(platformBaseline) ||
    serialize(operations) !== serialize(operationsBaseline);
  const notificationsDirty =
    serialize(notifications) !== serialize(notificationsBaseline);

  async function loadSettings(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiFetchAdmin<SettingsResponse>("/api/admin/settings", {
        cache: "no-store",
      });

      const nextProfile = { ...EMPTY_PROFILE, ...(res.profile || {}) };
      const nextPlatform = { ...EMPTY_PLATFORM, ...(res.settings?.platform || {}) };
      const nextOperations = { ...EMPTY_OPERATIONS, ...(res.settings?.operations || {}) };
      const nextNotifications = {
        ...EMPTY_NOTIFICATIONS,
        ...(res.settings?.notifications || {}),
      };

      setProfile(nextProfile);
      setProfileBaseline(nextProfile);
      setPlatform(nextPlatform);
      setPlatformBaseline(nextPlatform);
      setOperations(nextOperations);
      setOperationsBaseline(nextOperations);
      setNotifications(nextNotifications);
      setNotificationsBaseline(nextNotifications);
      setUpdatedAt(String(res.settings?.updatedAt || ""));
    } catch (err: any) {
      setError(err?.message || "Failed to load admin settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    void loadSettings();
  }, []);

  React.useEffect(() => {
    if (!notice) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [notice]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("profile");
    try {
      const res = await apiFetchAdmin<{ message?: string; profile: AdminProfile }>(
        "/api/admin/settings/profile",
        {
          method: "PATCH",
          body: JSON.stringify(profile),
        }
      );
      const nextProfile = { ...EMPTY_PROFILE, ...(res.profile || {}) };
      setProfile(nextProfile);
      setProfileBaseline(nextProfile);
      setNotice({ tone: "success", message: res.message || "Profile updated successfully." });
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Failed to update profile" });
    } finally {
      setSaving(null);
    }
  }

  async function savePlatform(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("platform");
    try {
      const res = await apiFetchAdmin<{
        message?: string;
        settings: {
          platform?: PlatformSettings;
          operations?: OperationsSettings;
          updatedAt?: string;
        };
      }>("/api/admin/settings/platform", {
        method: "PATCH",
        body: JSON.stringify({ platform, operations }),
      });
      const nextPlatform = { ...platform, ...(res.settings?.platform || {}) };
      const nextOperations = { ...operations, ...(res.settings?.operations || {}) };
      setPlatform(nextPlatform);
      setPlatformBaseline(nextPlatform);
      setOperations(nextOperations);
      setOperationsBaseline(nextOperations);
      setUpdatedAt(String(res.settings?.updatedAt || updatedAt || ""));
      setNotice({
        tone: "success",
        message: res.message || "Platform settings updated successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || "Failed to update platform settings",
      });
    } finally {
      setSaving(null);
    }
  }

  async function saveNotifications(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("notifications");
    try {
      const res = await apiFetchAdmin<{
        message?: string;
        settings: { notifications?: NotificationSettings; updatedAt?: string };
      }>("/api/admin/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({ notifications }),
      });
      const nextNotifications = {
        ...notifications,
        ...(res.settings?.notifications || {}),
      };
      setNotifications(nextNotifications);
      setNotificationsBaseline(nextNotifications);
      setUpdatedAt(String(res.settings?.updatedAt || updatedAt || ""));
      setNotice({
        tone: "success",
        message: res.message || "Notification settings updated successfully.",
      });
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Failed to update notifications" });
    } finally {
      setSaving(null);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      setNotice({ tone: "error", message: "Current and new password are required." });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setNotice({ tone: "error", message: "New password must be at least 8 characters." });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setNotice({ tone: "error", message: "Password confirmation does not match." });
      return;
    }

    setSaving("security");
    try {
      const res = await apiFetchAdmin<{ message?: string }>("/auth/admin/change-password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice({ tone: "success", message: res.message || "Password changed successfully." });
    } catch (err: any) {
      setNotice({ tone: "error", message: err?.message || "Failed to change password" });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[32px] bg-slate-200/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-[28px] bg-white shadow-sm" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 rounded-[30px] bg-white shadow-sm" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className={typography.pageTitle}>Settings failed to load</h1>
              <p className={`mt-2 ${typography.pageSubtitle}`}>{error}</p>
              <button
                type="button"
                onClick={() => void loadSettings()}
                className={`mt-5 rounded-2xl bg-emerald-700 px-5 py-3 text-white hover:bg-emerald-800 ${typography.buttonText}`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
      <AdminToast
        show={!!notice}
        message={notice?.message || ""}
        tone={notice?.tone || "success"}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Admin control center
              </span>
              <h1 className="ps-page-title mt-4 text-white">Settings</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90">
                Manage your admin profile, platform defaults, moderation rules,
                alerts, and password flow from one production-ready workspace.
              </p>
              {operations.maintenanceMode ? (
                <div className={`mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-emerald-50 ${typography.buttonText}`}>
                  <TriangleAlert className="h-4 w-4" />
                  Maintenance mode is enabled for the shared platform settings.
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void loadSettings(true)}
              disabled={refreshing}
              className={`inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-white backdrop-blur-sm hover:bg-white/15 disabled:opacity-60 ${typography.buttonText}`}
            >
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Profile readiness"
            value={`${profileScore(profile)}%`}
            detail="Completion across the current admin account fields."
            tone="border-emerald-100 bg-emerald-50/80"
            icon={<UserCog className="h-5 w-5" />}
          />
          <Stat
            title="Report SLA"
            value={`${operations.reportReviewSlaHours}h`}
            detail="Moderation target configured for reports."
            tone="border-emerald-100 bg-emerald-50/80"
            icon={<Clock3 className="h-5 w-5" />}
          />
          <Stat
            title="Notifications on"
            value={`${enabledAlerts(notifications)}/5`}
            detail={`Daily digest set for ${String(notifications.digestHour).padStart(2, "0")}:00`}
            tone="border-emerald-100 bg-emerald-50/80"
            icon={<BellRing className="h-5 w-5" />}
          />
          <Stat
            title="Site status"
            value={operations.maintenanceMode ? "Paused" : "Live"}
            detail={
              operations.newListingReviewRequired
                ? "New listings require review."
                : "New listings can publish directly."
            }
            tone="border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)]"
            icon={<Globe2 className="h-5 w-5" />}
          />
        </section>

        <Shell
          title="Admin profile"
          description="Saving this section updates the signed-in admin account details without changing auth or role logic."
          action={
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Account owner
            </span>
          }
        >
          <form className="space-y-6" onSubmit={saveProfile}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Full name"
                value={profile.name}
                onChange={(value) => setProfile((current) => ({ ...current, name: value }))}
              />
              <Field
                label="Email address"
                type="email"
                value={profile.email}
                onChange={(value) => setProfile((current) => ({ ...current, email: value }))}
              />
              <Field
                label="Phone number"
                value={profile.phone}
                onChange={(value) => setProfile((current) => ({ ...current, phone: value }))}
              />
              <Field
                label="Company or team"
                value={profile.company}
                onChange={(value) =>
                  setProfile((current) => ({ ...current, company: value }))
                }
              />
              <Area
                label="Address"
                className="md:col-span-2"
                value={profile.address}
                onChange={(value) => setProfile((current) => ({ ...current, address: value }))}
              />
              <Area
                label="Short bio"
                className="md:col-span-2"
                rows={4}
                value={profile.bio}
                onChange={(value) => setProfile((current) => ({ ...current, bio: value }))}
              />
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">
                  Role: {label(profile.role)}
                </span>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">
                  Provider: {label(profile.provider)}
                </span>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">
                  Created: {fmtDate(profile.createdAt)}
                </span>
              </div>
              <button
                type="submit"
                disabled={saving === "profile" || !profileDirty}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving === "profile"
                  ? "Saving..."
                  : profileDirty
                  ? "Save profile"
                  : "Profile saved"}
              </button>
            </div>
          </form>
        </Shell>

        <Shell
          title="Platform and operations"
          description="This section persists the shared platform identity and moderation defaults used by the admin side."
          action={
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Shared config
            </span>
          }
        >
          <form className="space-y-6" onSubmit={savePlatform}>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Platform name"
                value={platform.platformName}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, platformName: value }))
                }
              />
              <Field
                label="Support email"
                type="email"
                value={platform.supportEmail}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, supportEmail: value }))
                }
              />
              <Field
                label="Support phone"
                value={platform.supportPhone}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, supportPhone: value }))
                }
              />
              <Field
                label="Contact hours"
                value={platform.contactHours}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, contactHours: value }))
                }
              />
              <Field
                label="Default currency"
                value={platform.defaultCurrency}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, defaultCurrency: value }))
                }
              />
              <Field
                label="Default locale"
                value={platform.defaultLocale}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, defaultLocale: value }))
                }
              />
              <Area
                label="Support address"
                className="md:col-span-2"
                value={platform.supportAddress}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, supportAddress: value }))
                }
              />
              <Area
                label="Homepage headline"
                className="md:col-span-2"
                value={platform.homepageHeadline}
                onChange={(value) =>
                  setPlatform((current) => ({ ...current, homepageHeadline: value }))
                }
              />
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/45 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Operational rules</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    These controls update moderation defaults and feature flags.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Field
                  label="Featured listing fee"
                  type="number"
                  value={operations.featuredListingFee}
                  onChange={(value) =>
                    setOperations((current) => ({
                      ...current,
                      featuredListingFee: Number(value || 0),
                    }))
                  }
                />
                <Field
                  label="Report review SLA hours"
                  type="number"
                  value={operations.reportReviewSlaHours}
                  onChange={(value) =>
                    setOperations((current) => ({
                      ...current,
                      reportReviewSlaHours: Number(value || 0),
                    }))
                  }
                />
              </div>
              <div className="mt-5 grid gap-4">
                <Toggle
                  title="Require review for new listings"
                  description="Keep new submissions in an approval queue before they go live."
                  checked={operations.newListingReviewRequired}
                  onChange={(value) =>
                    setOperations((current) => ({
                      ...current,
                      newListingReviewRequired: value,
                    }))
                  }
                />
                <Toggle
                  title="Allow buyer reporting"
                  description="Controls whether users can report a listing from the public page."
                  checked={operations.allowBuyerReporting}
                  onChange={(value) =>
                    setOperations((current) => ({
                      ...current,
                      allowBuyerReporting: value,
                    }))
                  }
                />
                <Toggle
                  title="Allow Google login"
                  description="Keeps third-party authentication available for supported accounts."
                  checked={operations.allowGoogleLogin}
                  onChange={(value) =>
                    setOperations((current) => ({
                      ...current,
                      allowGoogleLogin: value,
                    }))
                  }
                />
                <Toggle
                  title="Maintenance mode"
                  description="Use this when platform access needs to be limited during maintenance."
                  checked={operations.maintenanceMode}
                  onChange={(value) =>
                    setOperations((current) => ({
                      ...current,
                      maintenanceMode: value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Last shared settings sync:{" "}
                <span className="font-semibold text-slate-700">{fmtDate(updatedAt)}</span>
              </p>
              <button
                type="submit"
                disabled={saving === "platform" || !platformDirty}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving === "platform"
                  ? "Saving..."
                  : platformDirty
                  ? "Save platform settings"
                  : "Settings saved"}
              </button>
            </div>
          </form>
        </Shell>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Shell
            title="Notification preferences"
            description="Choose which operational alerts and summaries stay active for the admin workspace."
            action={
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Alerts
              </span>
            }
          >
            <form className="space-y-5" onSubmit={saveNotifications}>
              <div className="grid gap-4">
                <Toggle
                  title="Email on new report"
                  description="Send an alert when a listing report is submitted."
                  checked={notifications.emailOnNewReport}
                  onChange={(value) =>
                    setNotifications((current) => ({
                      ...current,
                      emailOnNewReport: value,
                    }))
                  }
                />
                <Toggle
                  title="Email on new listing"
                  description="Send an alert when a new property enters the platform."
                  checked={notifications.emailOnNewListing}
                  onChange={(value) =>
                    setNotifications((current) => ({
                      ...current,
                      emailOnNewListing: value,
                    }))
                  }
                />
                <Toggle
                  title="Email on new user"
                  description="Alert the admin team when a new account is created."
                  checked={notifications.emailOnNewUser}
                  onChange={(value) =>
                    setNotifications((current) => ({
                      ...current,
                      emailOnNewUser: value,
                    }))
                  }
                />
                <Toggle
                  title="Daily digest"
                  description="Compile a single admin summary email every day."
                  checked={notifications.dailyDigest}
                  onChange={(value) =>
                    setNotifications((current) => ({
                      ...current,
                      dailyDigest: value,
                    }))
                  }
                />
                <Toggle
                  title="Product announcements"
                  description="Keep internal product and release reminders enabled."
                  checked={notifications.productAnnouncements}
                  onChange={(value) =>
                    setNotifications((current) => ({
                      ...current,
                      productAnnouncements: value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4 text-sm text-slate-600">
                  Use 24-hour format. The backend stores the digest hour between 0 and 23.
                </div>
                <Field
                  label="Digest hour"
                  type="number"
                  value={notifications.digestHour}
                  onChange={(value) =>
                    setNotifications((current) => ({
                      ...current,
                      digestHour: Number(value || 0),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-4 rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Enabled alert rules:{" "}
                  <span className="font-semibold text-slate-700">
                    {enabledAlerts(notifications)} of 5
                  </span>
                </p>
                <button
                  type="submit"
                  disabled={saving === "notifications" || !notificationsDirty}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving === "notifications"
                    ? "Saving..."
                    : notificationsDirty
                    ? "Save notifications"
                    : "Notifications saved"}
                </button>
              </div>
            </form>
          </Shell>

          <div className="space-y-6">
            <Shell
              title="Security"
              description="This reuses the existing authenticated password-change flow for admin accounts."
              action={
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Protected
                </span>
              }
            >
              <form className="space-y-5" onSubmit={savePassword}>
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4 text-sm text-slate-600">
                  Provider:{" "}
                  <span className="font-semibold text-slate-700">{label(profile.provider)}</span>.
                  Google-authenticated accounts cannot change passwords from this form.
                </div>
                <Field
                  label="Current password"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(value) =>
                    setPasswords((current) => ({ ...current, currentPassword: value }))
                  }
                />
                <Field
                  label="New password"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(value) =>
                    setPasswords((current) => ({ ...current, newPassword: value }))
                  }
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(value) =>
                    setPasswords((current) => ({ ...current, confirmPassword: value }))
                  }
                />
                <button
                  type="submit"
                  disabled={saving === "security" || profile.provider === "google"}
                  className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving === "security" ? "Saving..." : "Change password"}
                </button>
              </form>
            </Shell>

            <Shell
              title="Workspace summary"
              description="Quick readout of the saved platform identity and current live rules."
            >
              <div className="space-y-4 text-sm text-slate-600">
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-700" />
                    <div>
                      <p className="font-semibold text-slate-900">{platform.platformName}</p>
                      <p className="mt-1 text-slate-500">{platform.supportEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    <p>
                      Listing moderation:{" "}
                      <span className="font-semibold text-slate-700">
                        {operations.newListingReviewRequired
                          ? "Manual approval required"
                          : "Auto publishing enabled"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/45 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <LockKeyhole className="h-5 w-5 text-slate-700" />
                    <p>
                      Password changes go through the authenticated backend flow and do not
                      change admin roles or guardrails.
                    </p>
                  </div>
                </div>
              </div>
            </Shell>
          </div>
        </section>
      </div>
    </main>
  );
}
