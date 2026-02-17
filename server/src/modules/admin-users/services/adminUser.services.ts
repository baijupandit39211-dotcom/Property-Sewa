import { ApiError } from "../../../utils/apiError";
import User from "../../../models/User.model";
import AuditLog from "../../../models/AuditLog.model";

const ALLOWED_STATUSES = ["active", "inactive", "suspended"] as const;
const ALLOWED_ROLES = ["buyer", "seller", "agent", "admin", "superadmin"] as const;

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

  const q: any = {};

  if (search) {
    q.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  if (role) q.role = normalizeRole(role);
  if (status) q.status = normalizeRole(status);

  const [items, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(q),
  ]);

  return { items, total, page, limit };
}

export async function getUserById(id: string) {
  const user = await User.findById(id).lean();
  if (!user) throw new ApiError(404, "User not found");
  return user;
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
  const status = normalizeRole(params.status);

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
  await user.save();

  await AuditLog.create({
    action: "user.status.updated",
    actorId: actor.userId,
    targetUserId,
    reason: params.reason || "",
    metadata: { before, after: status },
    ip: params.ip || "",
    userAgent: params.userAgent || "",
  });

  return user.toObject();
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

  return user.toObject();
}
