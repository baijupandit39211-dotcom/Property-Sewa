import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../../utils/apiError";
import notificationService from "../services/notification.services";

export async function getUserNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const result = await notificationService.getUserNotifications(userId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const count = await notificationService.getUnreadCount(userId);
    return res.status(200).json({ success: true, count });
  } catch (err) {
    return next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const notification = await notificationService.markAsRead(req.params.id, userId);
    return res.status(200).json({ success: true, notification });
  } catch (err) {
    return next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const result = await notificationService.markAllAsRead(userId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}
