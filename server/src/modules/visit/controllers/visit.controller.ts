import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";
import visitService from "../services/visit.services";

// POST /visits (create visit request)
export async function createVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const {
      propertyId,
      requestedDate,
      preferredTime,
      message,
    } = req.body;

    if (!propertyId || !requestedDate || !preferredTime) {
      throw new ApiError(400, "Property ID, requested date, and preferred time are required");
    }

    // Get property to find seller
    const property = await Property.findById(propertyId);
    if (!property) throw new ApiError(404, "Property not found");

    // Normalize requestedDate to midnight local time to prevent timezone shifts
    const normalizedRequestedDate = new Date(requestedDate);
    normalizedRequestedDate.setHours(0, 0, 0, 0);

    const visit = await visitService.createVisit({
      propertyId,
      buyerId,
      sellerId: property.createdBy.toString(),
      requestedDate: normalizedRequestedDate,
      preferredTime,
      message,
    });

    return res.status(201).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// GET /visits (seller's visits with date range filtering)
export async function getSellerVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user?.userId as string;
    if (!sellerId) throw new ApiError(401, "Unauthorized");

    const result = await visitService.getVisitsBySeller(sellerId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

// GET /visits/my-visits (buyer's visits)
export async function getBuyerVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const result = await visitService.getVisitsByBuyer(buyerId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

// GET /visits/:id (get visit by ID)
export async function getVisitById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const visit = await visitService.getVisitById(req.params.id, userId);
    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// PUT /visits/:id (update visit - seller only)
export async function updateVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user?.userId as string;
    if (!sellerId) throw new ApiError(401, "Unauthorized");

    const {
      status,
      sellerResponse,
      actualDate,
      actualTime,
    } = req.body;

    // Normalize actualDate to midnight local time if provided to prevent timezone shifts
    let normalizedActualDate;
    if (actualDate) {
      normalizedActualDate = new Date(actualDate);
      normalizedActualDate.setHours(0, 0, 0, 0);
    }

    const visit = await visitService.updateVisit(req.params.id, sellerId, {
      status,
      sellerResponse,
      actualDate: normalizedActualDate,
      actualTime,
    });

    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// DELETE /visits/:id (delete visit request - buyer only)
export async function deleteVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const result = await visitService.deleteVisit(req.params.id, buyerId);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
