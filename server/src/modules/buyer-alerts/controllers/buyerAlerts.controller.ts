import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../../utils/apiError";
import buyerAlertsService from "../services/buyerAlerts.services";

export async function getFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const data = await buyerAlertsService.getFeed(userId);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const preferences = await buyerAlertsService.updatePreferences(userId, req.body || {});
    return res.status(200).json({ success: true, preferences });
  } catch (err) {
    return next(err);
  }
}

export async function createRule(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const rule = await buyerAlertsService.createRule(userId, req.body || {});
    return res.status(201).json({ success: true, rule });
  } catch (err) {
    return next(err);
  }
}

export async function updateRule(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const rule = await buyerAlertsService.updateRule(userId, req.params.id, req.body || {});
    return res.status(200).json({ success: true, rule });
  } catch (err) {
    return next(err);
  }
}

export async function deleteRule(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    await buyerAlertsService.deleteRule(userId, req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function markItemRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    await buyerAlertsService.markItemRead(userId, req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    await buyerAlertsService.markAllRead(userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    return next(err);
  }
}