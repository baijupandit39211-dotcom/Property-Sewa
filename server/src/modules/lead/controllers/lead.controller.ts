import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import leadService from "../services/lead.services";

// POST /leads (create inquiry)
export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { propertyId, name, email, phone, message } = req.body;
    const buyerId = req.user?.userId as string;
    const userRole = req.user?.role as string;

    // Validate user is buyer
    if (!buyerId) throw new ApiError(401, "Unauthorized");
    if (userRole !== "buyer") throw new ApiError(403, "Only buyers can create inquiries");

    // Validate required fields
    if (!propertyId || !name || !email || !message) {
      throw new ApiError(400, "Missing required fields: propertyId, name, email, message");
    }

    const lead = await leadService.createLead({
      propertyId,
      name,
      email,
      phone: phone || "",
      message,
      buyerId,
    });

    return res.status(201).json({ success: true, lead });
  } catch (err) {
    return next(err);
  }
}

// GET /leads/mine (seller-only)
export async function getMyLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user?.userId as string;
    if (!sellerId) throw new ApiError(401, "Unauthorized");

    const leads = await leadService.getLeadsBySeller(sellerId);
    return res.status(200).json({ success: true, items: leads });
  } catch (err) {
    return next(err);
  }
}

// GET /leads/my-inquiries (buyer-only)
export async function getMyInquiries(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user?.userId as string;
    if (!buyerId) throw new ApiError(401, "Unauthorized");

    const leads = await leadService.getLeadsByBuyer(buyerId);
    return res.status(200).json({ success: true, items: leads });
  } catch (err) {
    return next(err);
  }
}
