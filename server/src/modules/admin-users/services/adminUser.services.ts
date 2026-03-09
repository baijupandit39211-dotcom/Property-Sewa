import { ApiError } from "../../../utils/apiError";
import User from "../../../models/User.model";
import AuditLog from "../../../models/AuditLog.model";

const ALLOWED_STATUSES = ["active", "archived", "suspended"] as const;
const ALLOWED_ROLES = ["buyer", "seller", "agent", "admin", "superadmin"] as const;
const SAFE_USER_FIELDS =
  "_id name email avatar provider role status archivedAt phone address company bio createdAt updatedAt";
const MAX_LEN = 500;

type Actor = { userId: string; role: string };

function assertActor(actor: Actor) {
  if (!actor?.userId) throw new ApiError(401, "Authentication required");
}

function normalizeRole(role?: string) {
  return String(role || "").toLowerCase();
}

function cannotTouchSuperAdmin(actorRole: string, targetRole: string) {
  return actorRole !== "superadmin" && targetRole === "superadmin";
}

function normalizeStatus(status?: string) {
  const value = String(status || "").toLowerCase();
  if (value === "inactive") return "archived";
  return value;
}

function statusQuery(status?: string) {
  const normalized = normalizeStatus(status);
  if (!normalized) return undefined;
  if (normalized === "archived") {
    return { $in: ["archived", "inactive"] };
  }
  return normalized;
}

function toSafeUser(user: any) {
  if (!user) return user;

  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    _id: source._id,
    name: source.name || "",
    email: source.email || "",
    avatar: source.avatar || "",
    provider: source.provider || "",
    role: source.role || "buyer",
    status: normalizeStatus(source.status) || "active",
    archivedAt: source.archivedAt || null,
    phone: source.phone || "",
    address: source.address || "",
    company: source.company || "",
    bio: source.bio || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

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

export async function listUsers(params: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { search, role, status } = params;
  const page = Math.max(1, Number(params.page || 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
  const skip = (page - 1) * limit;

  const baseQuery: any = {};
  const listQuery: any = {};

  if (search) {
    baseQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  if (role) baseQuery.role = normalizeRole(role);
  Object.assign(listQuery, baseQuery);
  if (status) {
    const query = statusQuery(status);
    if (query) listQuery.status = query;
  }

  const [items, total, totalBase, active, archived, suspended] = await Promise.all([
    User.find(listQuery)
      .select(SAFE_USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(listQuery),
    User.countDocuments(baseQuery),
    User.countDocuments({ ...baseQuery, status: "active" }),
    User.countDocuments({ ...baseQuery, status: { $in: ["archived", "inactive"] } }),
    User.countDocuments({ ...baseQuery, status: "suspended" }),
  ]);

  return {
    items: items.map((item) => toSafeUser(item)),
    total,
    page,
    limit,
    stats: {
      total: totalBase,
      active,
      archived,
      suspended,
    },
  };
}

export async function getUserById(id: string) {
  const user = await User.findById(id).select(SAFE_USER_FIELDS).lean();
  if (!user) throw new ApiError(404, "User not found");
  return toSafeUser(user);
}

export async function updateStatus(params: {
  actor: Actor;
  targetUserId: string;
  status: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
}) {
  const { actor, targetUserId } = params;
  assertActor(actor);

  const actorRole = normalizeRole(actor.role);
  const status = normalizeStatus(params.status);

  if (!ALLOWED_STATUSES.includes(status as any)) {
    throw new ApiError(400, "Invalid status");
  }

  if (actor.userId === targetUserId) {
    throw new ApiError(403, "You cannot change your own status");
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, "User not found");

  const targetRole = normalizeRole(user.role);
  if (cannotTouchSuperAdmin(actorRole, targetRole)) {
    throw new ApiError(403, "Admins cannot modify a superadmin");
  }

  const before = user.status;
  user.status = status as any;
  if (status === "archived") {
    user.archivedAt = new Date();
  } else {
    user.archivedAt = null;
  }
  await user.save();

  await AuditLog.create({
    action: "user.status.updated",
    actorId: actor.userId,
    targetUserId,
    reason: params.reason || "",
    metadata: {
      before: normalizeStatus(before) || before,
      after: status,
      archivedAt: user.archivedAt,
    },
    ip: params.ip || "",
    userAgent: params.userAgent || "",
  });

  return toSafeUser(user);
}

export async function updateRole(params: {
  actor: Actor;
  targetUserId: string;
  role: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
}) {
  const { actor, targetUserId } = params;
  assertActor(actor);

  const actorRole = normalizeRole(actor.role);
  if (actorRole !== "superadmin") {
    throw new ApiError(403, "Only superadmin can change roles");
  }

  if (actor.userId === targetUserId) {
    throw new ApiError(403, "You cannot change your own role");
  }

  const role = normalizeRole(params.role);
  if (!ALLOWED_ROLES.includes(role as any)) {
    throw new ApiError(400, "Invalid role");
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, "User not found");

  const before = user.role;
  user.role = role as any;
  await user.save();

  await AuditLog.create({
    action: "user.role.updated",
    actorId: actor.userId,
    targetUserId,
    reason: params.reason || "",
    metadata: { before, after: role },
    ip: params.ip || "",
    userAgent: params.userAgent || "",
  });

  return toSafeUser(user);
}

export async function updateUserDetails(params: {
  actor: Actor;
  targetUserId: string;
  body: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
    bio?: string;
  };
  reason?: string;
  ip?: string;
  userAgent?: string;
}) {
  const { actor, targetUserId, body } = params;
  assertActor(actor);

  const actorRole = normalizeRole(actor.role);
  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, "User not found");

  const targetRole = normalizeRole(user.role);
  if (cannotTouchSuperAdmin(actorRole, targetRole)) {
    throw new ApiError(403, "Admins cannot modify a superadmin");
  }

  const nextEmail = normalizeEmail(body.email);
  if (nextEmail !== undefined) {
    if (!nextEmail) throw new ApiError(400, "Email is required");
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: targetUserId } });
    if (existing) throw new ApiError(400, "Email already exists");
    user.email = nextEmail;
  }

  const updates = {
    name: sanitizeString(body.name, 120),
    phone: sanitizeString(body.phone, 40),
    address: sanitizeString(body.address, 200),
    company: sanitizeString(body.company, 160),
    bio: sanitizeString(body.bio, 500),
  };

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.phone !== undefined) user.phone = updates.phone;
  if (updates.address !== undefined) user.address = updates.address;
  if (updates.company !== undefined) user.company = updates.company;
  if (updates.bio !== undefined) user.bio = updates.bio;

  await user.save();

  await AuditLog.create({
    action: "user.profile.updated",
    actorId: actor.userId,
    targetUserId,
    reason: params.reason || "",
    metadata: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      company: user.company,
      bio: user.bio,
    },
    ip: params.ip || "",
    userAgent: params.userAgent || "",
  });

  return toSafeUser(user);
}
