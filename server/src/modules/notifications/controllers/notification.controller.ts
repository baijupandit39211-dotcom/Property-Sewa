import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../../utils/apiError";
import notificationService from "../services/notification.services";
import { logDevTiming, nowMs, payloadSizeBytes } from "../../../utils/devTiming";

export async function getUserNotifications(req: Request, res: Response, next: NextFunction) {
  const started = nowMs();
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const result = await notificationService.getUserNotifications(userId, req.query);
    const payload = { success: true, ...result };
    const endpoint = req.baseUrl.includes("/admin/notifications")
      ? "GET /api/admin/notifications"
      : "GET /notifications";
    logDevTiming(endpoint, {
      totalMs: Number((nowMs() - started).toFixed(2)),
      payloadBytes: payloadSizeBytes(payload),
      resultCount: result?.items?.length ?? 0,
      total: result?.total ?? 0,
    });
    return res.status(200).json(payload);
  } catch (err) {
    return next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  const started = nowMs();
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const count = await notificationService.getUnreadCount(userId);
    const payload = { success: true, count };
    const endpoint = req.baseUrl.includes("/admin/notifications")
      ? "GET /api/admin/notifications/unread-count"
      : "GET /notifications/unread-count";
    logDevTiming(endpoint, {
      totalMs: Number((nowMs() - started).toFixed(2)),
      payloadBytes: payloadSizeBytes(payload),
      count,
    });
    return res.status(200).json(payload);
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
