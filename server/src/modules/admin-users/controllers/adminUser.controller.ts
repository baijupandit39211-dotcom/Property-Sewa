import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import * as adminUserService from "../services/adminUser.services";

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, role, status, page, limit } = req.query;

    const result = await adminUserService.listUsers({
      search: search as string,
      role: role as string,
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({ success: true, ...result });
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
