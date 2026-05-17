import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import * as adminUserService from "../services/adminUser.services";
import { logDevTiming, nowMs, payloadSizeBytes } from "../../../utils/devTiming";

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  const started = nowMs();
  try {
    const { search, role, status, page, limit } = req.query;

    const result = await adminUserService.listUsers({
      search: search as string,
      role: role as string,
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    const payload = { success: true, ...result };
    logDevTiming("GET /api/admin/users", {
      totalMs: Number((nowMs() - started).toFixed(2)),
      payloadBytes: payloadSizeBytes(payload),
      resultCount: result?.items?.length ?? 0,
      total: result?.total ?? 0,
      page: result?.page ?? 1,
      limit: result?.limit ?? 0,
    });
    return res.status(200).json(payload);
  } catch (err) {
    return next(err);
  }
}

export async function getStats(_req: Request, res: Response, next: NextFunction) {
  const started = nowMs();
  try {
    const stats = await adminUserService.getUserStats();
    const payload = { success: true, stats };
    logDevTiming("GET /api/admin/users/stats", {
      totalMs: Number((nowMs() - started).toFixed(2)),
      payloadBytes: payloadSizeBytes(payload),
    });
    return res.status(200).json(payload);
  } catch (err) {
    return next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = {
      userId: String(req.user?.userId || ""),
      role: String(req.user?.role || ""),
    };
    if (!actor.userId) throw new ApiError(401, "Authentication required");

    const user = await adminUserService.createUser({
      actor,
      body: {
        name: req.body?.name,
        email: req.body?.email,
        role: req.body?.role,
        status: req.body?.status,
      },
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] || ""),
    });

    return res.status(201).json({ success: true, user });
  } catch (err) {
    return next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminUserService.getUserById(req.params.id);
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = {
      userId: String(req.user?.userId || ""),
      role: String(req.user?.role || ""),
    };
    if (!actor.userId) throw new ApiError(401, "Authentication required");

    const status = String(req.body?.status || "").toLowerCase();

    const updated = await adminUserService.updateStatus({
      actor,
      targetUserId: req.params.id,
      status,
      reason: String(req.body?.reason || ""),
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] || ""),
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    return next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = {
      userId: String(req.user?.userId || ""),
      role: String(req.user?.role || ""),
    };
    if (!actor.userId) throw new ApiError(401, "Authentication required");

    const role = String(req.body?.role || "").toLowerCase();

    const updated = await adminUserService.updateRole({
      actor,
      targetUserId: req.params.id,
      role,
      reason: String(req.body?.reason || ""),
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] || ""),
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    return next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = {
      userId: String(req.user?.userId || ""),
      role: String(req.user?.role || ""),
    };
    if (!actor.userId) throw new ApiError(401, "Authentication required");

    const updated = await adminUserService.updateUserDetails({
      actor,
      targetUserId: req.params.id,
      body: {
        name: req.body?.name,
        email: req.body?.email,
        phone: req.body?.phone,
        address: req.body?.address,
        company: req.body?.company,
        bio: req.body?.bio,
      },
      reason: String(req.body?.reason || ""),
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] || ""),
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    return next(err);
  }
}
