import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../../utils/apiError";
import * as adminSettingsService from "../services/adminSettings.services";

function getActorId(req: Request) {
  return String(req.user?.userId || "");
}

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = getActorId(req);
    if (!adminUserId) throw new ApiError(401, "Authentication required");

    const result = await adminSettingsService.getAdminSettings(adminUserId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = getActorId(req);
    if (!adminUserId) throw new ApiError(401, "Authentication required");

    const profile = await adminSettingsService.updateAdminProfile(adminUserId, {
      name: req.body?.name,
      email: req.body?.email,
      phone: req.body?.phone,
      address: req.body?.address,
      company: req.body?.company,
      bio: req.body?.bio,
    });

    return res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      profile,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePlatform(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = getActorId(req);
    if (!adminUserId) throw new ApiError(401, "Authentication required");

    const settings = await adminSettingsService.updatePlatformSettings(adminUserId, {
      platform: req.body?.platform,
      operations: req.body?.operations,
    });

    return res.status(200).json({
      success: true,
      message: "Platform settings updated successfully",
      settings,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateNotifications(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const adminUserId = getActorId(req);
    if (!adminUserId) throw new ApiError(401, "Authentication required");

    const settings = await adminSettingsService.updateNotificationSettings(adminUserId, {
      notifications: req.body?.notifications,
    });

    return res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      settings,
    });
  } catch (error) {
    return next(error);
  }
}
