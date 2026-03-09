import { ApiError } from "../../../utils/apiError";
import User from "../../../models/User.model";
import AdminSettings from "../../../models/AdminSettings.model";

const MAX_LEN = 500;
const SINGLETON_KEY = "primary";

function sanitizeString(value: any, max = MAX_LEN) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return "";
  return text.slice(0, max);
}

function normalizeEmail(value: any) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim().toLowerCase();
  return text || "";
}

function clampNumber(value: any, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function asBoolean(value: any, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function safeProfile(user: any) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    company: user.company || "",
    bio: user.bio || "",
    avatar: user.avatar || "",
    role: user.role || "admin",
    provider: user.provider || "local",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function getOrCreateSettings() {
  let settings = await AdminSettings.findOne({ singletonKey: SINGLETON_KEY });
  if (!settings) {
    settings = await AdminSettings.create({ singletonKey: SINGLETON_KEY });
  }
  return settings;
}

export async function getAdminSettings(adminUserId: string) {
  const [settings, admin] = await Promise.all([
    getOrCreateSettings(),
    User.findById(adminUserId).select("-passwordHash").lean(),
  ]);

  if (!admin) throw new ApiError(404, "Admin not found");

  return {
    profile: safeProfile(admin),
    settings: {
      platform: settings.platform,
      operations: settings.operations,
      notifications: settings.notifications,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    },
  };
}

export async function updateAdminProfile(
  adminUserId: string,
  body: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    bio?: string;
  }
) {
  const admin = await User.findById(adminUserId);
  if (!admin) throw new ApiError(404, "Admin not found");

  const nextEmail = normalizeEmail(body.email);
  if (nextEmail !== undefined) {
    if (!nextEmail) throw new ApiError(400, "Email is required");
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: adminUserId } });
    if (existing) throw new ApiError(400, "Email already exists");
    admin.email = nextEmail;
  }

  const updates = {
    name: sanitizeString(body.name, 120),
    phone: sanitizeString(body.phone, 40),
    address: sanitizeString(body.address, 200),
    company: sanitizeString(body.company, 160),
    bio: sanitizeString(body.bio, 500),
  };

  if (updates.name !== undefined) admin.name = updates.name;
  if (updates.phone !== undefined) admin.phone = updates.phone;
  if (updates.address !== undefined) admin.address = updates.address;
  if (updates.company !== undefined) admin.company = updates.company;
  if (updates.bio !== undefined) admin.bio = updates.bio;

  await admin.save();

  return safeProfile(admin);
}

export async function updatePlatformSettings(
  adminUserId: string,
  body: {
    platform?: {
      platformName?: string;
      supportEmail?: string;
      supportPhone?: string;
      supportAddress?: string;
      contactHours?: string;
      defaultCurrency?: string;
      defaultLocale?: string;
      homepageHeadline?: string;
    };
    operations?: {
      featuredListingFee?: number;
      reportReviewSlaHours?: number;
      newListingReviewRequired?: boolean;
      allowBuyerReporting?: boolean;
      allowGoogleLogin?: boolean;
      maintenanceMode?: boolean;
    };
  }
) {
  const settings = await getOrCreateSettings();

  if (body.platform) {
    settings.platform.platformName =
      sanitizeString(body.platform.platformName, 120) || settings.platform.platformName;
    settings.platform.supportEmail =
      normalizeEmail(body.platform.supportEmail) || settings.platform.supportEmail;
    settings.platform.supportPhone =
      sanitizeString(body.platform.supportPhone, 40) || "";
    settings.platform.supportAddress =
      sanitizeString(body.platform.supportAddress, 220) || "";
    settings.platform.contactHours =
      sanitizeString(body.platform.contactHours, 120) ||
      settings.platform.contactHours;
    settings.platform.defaultCurrency =
      sanitizeString(body.platform.defaultCurrency, 12) ||
      settings.platform.defaultCurrency;
    settings.platform.defaultLocale =
      sanitizeString(body.platform.defaultLocale, 24) ||
      settings.platform.defaultLocale;
    settings.platform.homepageHeadline =
      sanitizeString(body.platform.homepageHeadline, 180) ||
      settings.platform.homepageHeadline;
  }

  if (body.operations) {
    settings.operations.featuredListingFee = clampNumber(
      body.operations.featuredListingFee,
      settings.operations.featuredListingFee || 0,
      0,
      1000000
    );
    settings.operations.reportReviewSlaHours = clampNumber(
      body.operations.reportReviewSlaHours,
      settings.operations.reportReviewSlaHours || 24,
      1,
      168
    );
    settings.operations.newListingReviewRequired = asBoolean(
      body.operations.newListingReviewRequired,
      settings.operations.newListingReviewRequired
    );
    settings.operations.allowBuyerReporting = asBoolean(
      body.operations.allowBuyerReporting,
      settings.operations.allowBuyerReporting
    );
    settings.operations.allowGoogleLogin = asBoolean(
      body.operations.allowGoogleLogin,
      settings.operations.allowGoogleLogin
    );
    settings.operations.maintenanceMode = asBoolean(
      body.operations.maintenanceMode,
      settings.operations.maintenanceMode
    );
  }

  settings.updatedBy = adminUserId as any;
  await settings.save();

  return {
    platform: settings.platform,
    operations: settings.operations,
    updatedAt: settings.updatedAt,
  };
}

export async function updateNotificationSettings(
  adminUserId: string,
  body: {
    notifications?: {
      emailOnNewReport?: boolean;
      emailOnNewListing?: boolean;
      emailOnNewUser?: boolean;
      dailyDigest?: boolean;
      digestHour?: number;
      productAnnouncements?: boolean;
    };
  }
) {
  const settings = await getOrCreateSettings();
  const notifications = body.notifications || {};

  settings.notifications.emailOnNewReport = asBoolean(
    notifications.emailOnNewReport,
    settings.notifications.emailOnNewReport
  );
  settings.notifications.emailOnNewListing = asBoolean(
    notifications.emailOnNewListing,
    settings.notifications.emailOnNewListing
  );
  settings.notifications.emailOnNewUser = asBoolean(
    notifications.emailOnNewUser,
    settings.notifications.emailOnNewUser
  );
  settings.notifications.dailyDigest = asBoolean(
    notifications.dailyDigest,
    settings.notifications.dailyDigest
  );
  settings.notifications.digestHour = clampNumber(
    notifications.digestHour,
    settings.notifications.digestHour || 9,
    0,
    23
  );
  settings.notifications.productAnnouncements = asBoolean(
    notifications.productAnnouncements,
    settings.notifications.productAnnouncements
  );

  settings.updatedBy = adminUserId as any;
  await settings.save();

  return {
    notifications: settings.notifications,
    updatedAt: settings.updatedAt,
  };
}
