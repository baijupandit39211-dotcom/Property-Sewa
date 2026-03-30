import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import wishlistService from "../services/wishlist.services";

export async function getMyWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    const userRole = req.user?.role as string;

    if (!buyerId) throw new ApiError(401, "Unauthorized");
    if (userRole !== "buyer") throw new ApiError(403, "Only buyers can access wishlist");

    const result = await wishlistService.getWishlist(buyerId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function addMyWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    const userRole = req.user?.role as string;
    const propertyId = String(req.body?.propertyId || "").trim();

    if (!buyerId) throw new ApiError(401, "Unauthorized");
    if (userRole !== "buyer") throw new ApiError(403, "Only buyers can add wishlist items");
    if (!propertyId) throw new ApiError(400, "propertyId is required");

    const item = await wishlistService.addToWishlist(buyerId, propertyId);
    return res.status(200).json({ success: true, item });
  } catch (err) {
    return next(err);
  }
}

export async function removeMyWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    const userRole = req.user?.role as string;
    const propertyId = String(req.params?.propertyId || "").trim();

    if (!buyerId) throw new ApiError(401, "Unauthorized");
    if (userRole !== "buyer") throw new ApiError(403, "Only buyers can remove wishlist items");
    if (!propertyId) throw new ApiError(400, "propertyId is required");

    const result = await wishlistService.removeFromWishlist(buyerId, propertyId);
    return res.status(200).json({ success: true, removed: result.success, propertyId });
  } catch (err) {
    return next(err);
  }
}

export async function checkMyWishlist(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    const userRole = req.user?.role as string;
    const propertyId = String(req.params?.propertyId || "").trim();

    if (!buyerId) throw new ApiError(401, "Unauthorized");
    if (userRole !== "buyer") throw new ApiError(403, "Only buyers can check wishlist");
    if (!propertyId) throw new ApiError(400, "propertyId is required");

    const saved = await wishlistService.isInWishlist(buyerId, propertyId);
    return res.status(200).json({ success: true, saved });
  } catch (err) {
    return next(err);
  }
}
