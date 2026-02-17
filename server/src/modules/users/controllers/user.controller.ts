import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import * as userService from "../services/user.services";

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Authentication required");

    const updated = await userService.updateMe(userId, req.body);
    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    return next(err);
  }
}
