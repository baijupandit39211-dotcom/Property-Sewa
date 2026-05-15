"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type MeResponse = {
  success?: boolean;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    phone?: string;
    address?: string;
    company?: string;
    bio?: string;
  };
  message?: string;
};

type Tab = "profile" | "security" | "notifications" | "preferences";

type NotificationSettings = {
  alerts: boolean;
  messages: boolean;
  emailUpdates: boolean;
};

type PreferenceSettings = {
  preferredLocation: string;
  budgetMin: string;
  budgetMax: string;
  propertyType: string;
};

const NOTIFICATION_KEY = "property-sewa:buyer-notification-settings";
const PREFERENCE_KEY = "property-sewa:buyer-preference-settings";
const AVATAR_KEY = "property-sewa:buyer-profile-avatar";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function BuyerProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<Tab>("profile");
  const [data, setData] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingProfile, setEditingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [avatarPreview, setAvatarPreview] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [notifications, setNotifications] = useState<NotificationSettings>({
    alerts: true,
    messages: true,
    emailUpdates: true,
  });

  const [preferences, setPreferences] = useState<PreferenceSettings>({
    preferredLocation: "",
    budgetMin: "",
    budgetMax: "",
    propertyType: "",
  });
  const [preferencesSaved, setPreferencesSaved] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch<MeResponse>("/auth/me");
        if (res?.success === false || !res?.user) {
          throw new Error(res?.message || "Failed to load profile");
        }

        setData(res.user);
        setProfileForm({
          name: res.user.name || "",
          email: res.user.email || "",
          phone: res.user.phone || "",
        });
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setNotifications(
      readJson<NotificationSettings>(NOTIFICATION_KEY, {
        alerts: true,
        messages: true,
        emailUpdates: true,
      })
    );
    setPreferences(
      readJson<PreferenceSettings>(PREFERENCE_KEY, {
        preferredLocation: "",
        budgetMin: "",
        budgetMax: "",
        propertyType: "",
      })
    );
    setAvatarPreview(window.localStorage.getItem(AVATAR_KEY) || "");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!preferencesSaved) return;
    const timer = window.setTimeout(() => setPreferencesSaved(""), 1800);
    return () => window.clearTimeout(timer);
  }, [preferencesSaved]);

  const initials = useMemo(
    () => (data?.name || data?.email || "U").slice(0, 1).toUpperCase(),
    [data]
  );

  const handleStartEdit = () => {
    setProfileError("");
    setProfileSuccess("");
    setProfileForm({
      name: data?.name || "",
      email: data?.email || "",
      phone: data?.phone || "",
    });
  };

  const handleCancelEdit = () => {
    setProfileError("");
    setProfileSuccess("");
    setProfileForm({
      name: data?.name || "",
      email: data?.email || "",
      phone: data?.phone || "",
    });
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileError("");
      setProfileSuccess("");

      const res = await apiFetch<MeResponse>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
        }),
      });

      if (res?.success === false || !res?.user) {
        throw new Error(res?.message || "Failed to update profile");
      }

      setData((current) => ({
        ...current,
        ...res.user,
      }));
      setProfileForm({
        name: res.user.name || "",
        email: res.user.email || profileForm.email,
        phone: res.user.phone || "",
      });
      setEditingProfile(true);
      setProfileSuccess("Profile updated successfully.");
    } catch (e: any) {
      setProfileError(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatarPreview(result);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(AVATAR_KEY, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      setPasswordSuccess("");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      setPasswordSuccess("");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      setPasswordSuccess("");
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError("");
      setPasswordSuccess("");

      const res = await apiFetch<{ success?: boolean; message?: string }>("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (res?.success === false) {
        throw new Error(res?.message || "Failed to change password");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordSuccess(res?.message || "Password changed successfully.");
    } catch (e: any) {
      setPasswordError(e?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
    setPasswordSuccess("");
    setShowPasswords({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  const savePreferences = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
    }
    setPreferencesSaved("Preferences saved.");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <section className="overflow-hidden rounded-[32px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
            <User className="h-3.5 w-3.5" />
            Buyer profile
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Profile Settings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            Manage account details, security, notifications, and preferences from one workspace.
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0D1C12] ring-1 ring-[#D1D5DB] transition hover:bg-[#F7FCFA]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-full bg-[#EEF8EB] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#316249] ring-1 ring-[#D1D5DB]">
          Profile Settings
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="w-full max-w-sm rounded-[28px] border border-[#D1D5DB] bg-white p-6 shadow-[0_10px_24px_rgba(13,28,18,0.06)]">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="h-24 w-24 rounded-[26px] object-cover ring-4 ring-[#EEF8EB]"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-[26px] bg-[#EEF8EB] text-3xl font-semibold text-[#316249] ring-4 ring-[#EEF8EB]">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full bg-[#316249] text-white shadow-lg transition hover:bg-[#28513D]"
                aria-label="Upload profile image"
              >
                <Camera className="h-4 w-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#0D1C12]">
              {data?.name || "Buyer"}
            </h1>
            <p className="mt-1 text-sm text-[#618975]">{data?.email || "No email available"}</p>

            <div className="mt-5 grid w-full gap-3">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={data?.email || "Not provided"} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={data?.phone || "Not provided"} />
              <InfoRow icon={<Shield className="h-4 w-4" />} label="Role" value={data?.role || "buyer"} />
            </div>

          </div>
        </section>

        <section className="rounded-[28px] border border-[#D1D5DB] bg-white p-5 shadow-[0_10px_24px_rgba(13,28,18,0.06)]">
          <div className="flex flex-wrap gap-2 border-b border-[#D1D5DB] pb-4">
            <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={<User className="h-4 w-4" />}>
              Profile
            </TabButton>
            <TabButton active={tab === "security"} onClick={() => setTab("security")} icon={<Lock className="h-4 w-4" />}>
              Security
            </TabButton>
            <TabButton
              active={tab === "notifications"}
              onClick={() => setTab("notifications")}
              icon={<Bell className="h-4 w-4" />}
            >
              Notifications
            </TabButton>
            <TabButton
              active={tab === "preferences"}
              onClick={() => setTab("preferences")}
              icon={<ChevronRight className="h-4 w-4" />}
            >
              Preferences
            </TabButton>
          </div>

          {loading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-[#618975]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile...
            </div>
          )}

          {error && !loading && (
            <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-[#F7FCFA] px-4 py-3 text-sm text-[#618975]">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-6">
              {tab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0D1C12]">Profile Information</h2>
                    <p className="mt-1 text-sm text-[#618975]">
                      Review and update your buyer account details.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Full Name"
                      value={profileForm.name}
                      onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))}
                      readOnly={!editingProfile}
                      required
                      placeholder="Enter your full name"
                    />
                    <InputField
                      label="Phone"
                      value={profileForm.phone}
                      onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))}
                      readOnly={!editingProfile}
                      required
                      placeholder="Enter your phone number"
                    />
                    <InputField
                      label="Email"
                      value={profileForm.email}
                      readOnly
                      disabled
                      placeholder="Email address"
                    />
                  </div>

                  {profileError ? (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7FCFA] px-4 py-3 text-sm text-[#618975]">
                      {profileError}
                    </div>
                  ) : null}

                  {profileSuccess ? (
                    <div className="flex items-start gap-2 rounded-lg border border-[#D1D5DB] bg-[#EEF8EB] px-4 py-3 text-sm text-[#316249]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {profileSuccess}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1C12] transition hover:bg-[#F7FCFA]"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#316249] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#28513D] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Save className="h-4 w-4" />
                      {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {tab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0D1C12]">Change Password</h2>
                    <p className="mt-1 text-sm text-[#618975]">
                      Update your password to keep your account secure.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <PasswordField
                      label="Current Password"
                      value={passwordForm.currentPassword}
                      required
                      placeholder="Enter current password"
                      show={showPasswords.currentPassword}
                      onToggleShow={() =>
                        setShowPasswords((current) => ({
                          ...current,
                          currentPassword: !current.currentPassword,
                        }))
                      }
                      onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
                    />
                    <div />
                    <PasswordField
                      label="New Password"
                      value={passwordForm.newPassword}
                      required
                      placeholder="At least 8 characters"
                      show={showPasswords.newPassword}
                      onToggleShow={() =>
                        setShowPasswords((current) => ({
                          ...current,
                          newPassword: !current.newPassword,
                        }))
                      }
                      onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
                    />
                    <PasswordField
                      label="Confirm New Password"
                      value={passwordForm.confirmPassword}
                      required
                      placeholder="Re-enter new password"
                      show={showPasswords.confirmPassword}
                      onToggleShow={() =>
                        setShowPasswords((current) => ({
                          ...current,
                          confirmPassword: !current.confirmPassword,
                        }))
                      }
                      onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#D1D5DB] bg-[#F7FCFA] px-4 py-3 text-sm text-[#618975]">
                    New password must be at least 8 characters, and the confirmation must match exactly.
                  </div>

                  {passwordError ? (
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7FCFA] px-4 py-3 text-sm text-[#618975]">
                      {passwordError}
                    </div>
                  ) : null}

                  {passwordSuccess ? (
                    <div className="flex items-start gap-2 rounded-lg border border-[#D1D5DB] bg-[#EEF8EB] px-4 py-3 text-sm text-[#316249]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      {passwordSuccess}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelPassword}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1C12] transition hover:bg-[#F7FCFA]"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#316249] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#28513D] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Lock className="h-4 w-4" />
                      {changingPassword ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              )}

              {tab === "notifications" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0D1C12]">Notification Settings</h2>
                    <p className="mt-1 text-sm text-[#618975]">
                      Choose how you want Property Sewa to keep you informed.
                    </p>
                  </div>

                  <ToggleRow
                    label="Property alerts"
                    description="Receive updates when matching listings or property alerts are available."
                    checked={notifications.alerts}
                    onChange={(checked) => setNotifications((current) => ({ ...current, alerts: checked }))}
                  />
                  <ToggleRow
                    label="Messages"
                    description="Get notified when a seller or agent sends you a new message."
                    checked={notifications.messages}
                    onChange={(checked) => setNotifications((current) => ({ ...current, messages: checked }))}
                  />
                  <ToggleRow
                    label="Email updates"
                    description="Receive occasional product updates and account-related email communication."
                    checked={notifications.emailUpdates}
                    onChange={(checked) => setNotifications((current) => ({ ...current, emailUpdates: checked }))}
                  />
                </div>
              )}

              {tab === "preferences" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0D1C12]">Buyer Preferences</h2>
                    <p className="mt-1 text-sm text-[#618975]">
                      Set your preferred search profile for a better browsing experience.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Preferred Location"
                      value={preferences.preferredLocation}
                      onChange={(value) =>
                        setPreferences((current) => ({ ...current, preferredLocation: value }))
                      }
                      icon={<MapPin className="h-4 w-4 text-[#618975]" />}
                    />
                    <SelectField
                      label="Property Type"
                      value={preferences.propertyType}
                      onChange={(value) =>
                        setPreferences((current) => ({ ...current, propertyType: value }))
                      }
                      options={[
                        { label: "Any type", value: "" },
                        { label: "Villa", value: "villa" },
                        { label: "Apartment", value: "apartment" },
                        { label: "House", value: "house" },
                        { label: "Land", value: "land" },
                      ]}
                    />
                    <InputField
                      label="Budget Min"
                      value={preferences.budgetMin}
                      onChange={(value) => setPreferences((current) => ({ ...current, budgetMin: value }))}
                    />
                    <InputField
                      label="Budget Max"
                      value={preferences.budgetMax}
                      onChange={(value) => setPreferences((current) => ({ ...current, budgetMax: value }))}
                    />
                  </div>

                  {preferencesSaved ? (
                    <div className="rounded-2xl border border-[#D1D5DB] bg-[#EEF8EB] px-4 py-3 text-sm text-[#316249]">
                      {preferencesSaved}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={savePreferences}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#316249] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#28513D]"
                    >
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-[#EEF8EB] text-[#316249] ring-1 ring-[#D1D5DB]"
          : "bg-[#E8F2EB] text-[#618975] hover:bg-[#E5E7EB]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D1D5DB] bg-[#F7FCFA] px-4 py-3 text-left">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#618975]">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[#0D1C12]">{value}</div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
  icon,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#618975]">{label}</span>
      <div
        className={cn(
          "flex h-12 items-center gap-3 rounded-2xl border px-4 transition",
          disabled
            ? "cursor-not-allowed border-[#D1D5DB] bg-[#E8F2EB]"
            : readOnly
            ? "border-[#D1D5DB] bg-[#F7FCFA]"
            : "border-[#D1D5DB] bg-white focus-within:border-[#316249] focus-within:ring-4 focus-within:ring-[#316249]/15"
        )}
      >
        {icon}
        <input
          type={type}
          value={value ?? ""}
          readOnly={readOnly}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(
            "w-full bg-transparent text-sm text-[#0D1C12] outline-none placeholder:text-[#618975]",
            disabled && "cursor-not-allowed text-[#618975]"
          )}
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#618975]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#D1D5DB] bg-white px-4 text-sm text-[#0D1C12] outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#D1D5DB] bg-[#F7FCFA] px-4 py-4">
      <div>
        <div className="text-sm font-semibold text-[#0D1C12]">{label}</div>
        <div className="mt-1 text-sm leading-6 text-[#618975]">{description}</div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
          checked ? "bg-[#316249]" : "bg-[#D1D5DB]"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  required,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#618975]">{label}</span>
      <div className="flex h-12 items-center gap-3 rounded-2xl border border-[#D1D5DB] bg-white px-4 transition focus-within:border-[#316249] focus-within:ring-4 focus-within:ring-[#316249]/15">
        <input
          type={show ? "text" : "password"}
          value={value ?? ""}
          required={required}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className="w-full bg-transparent text-sm text-[#0D1C12] outline-none placeholder:text-[#618975]"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          className="text-[#618975] transition hover:text-[#618975]"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
