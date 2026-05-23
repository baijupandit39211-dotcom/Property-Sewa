import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import feedbackService from "../services/feedback.services";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function createFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    const userRole = String(req.user?.role || "").toLowerCase();
    if (!userId) throw new ApiError(401, "Unauthorized");

    const category = normalizeText(req.body?.category).toLowerCase();
    const message = normalizeText(req.body?.message);
    const rating = Number(req.body?.rating || 0);
    const allowContact = Boolean(req.body?.allowContact);

    if (!category) throw new ApiError(400, "Feedback category is required.");
    if (!message || message.length < 10) throw new ApiError(400, "Feedback message should be at least 10 characters.");
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new ApiError(400, "Rating must be between 1 and 5.");

    const item = await feedbackService.createFeedback({
      userId,
      userRole,
      category,
      message,
      rating,
      allowContact,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    return next(err);
  }
}

export async function getMyFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const items = await feedbackService.getMyFeedback(userId);
    return res.status(200).json({ success: true, items });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await feedbackService.getAdminFeedback(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function updateFeedbackStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = normalizeText(req.params?.id);
    const status = normalizeText(req.body?.status).toLowerCase();
    if (!id) throw new ApiError(400, "Feedback id is required.");
    if (!["new", "reviewed", "resolved"].includes(status)) {
      throw new ApiError(400, "Invalid feedback status.");
    }

    const item = await feedbackService.updateFeedbackStatus(id, status as "new" | "reviewed" | "resolved");
    return res.status(200).json({ success: true, item });
  } catch (err) {
    return next(err);
  }
}