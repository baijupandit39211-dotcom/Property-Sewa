import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import leadService from "../services/lead.services";
import notificationService from "../../notifications/services/notification.services";

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

    try {
      await notificationService.createNotification({
        recipientId: String(lead.sellerId),
        recipientRole: "seller",
        actorId: buyerId,
        type: "alert.general",
        category: "alert",
        title: "New buyer inquiry",
        body: `${name} sent an inquiry about ${(lead.propertyId as any)?.title || "your property"}.`,
        data: {
          leadId: String(lead._id),
          propertyId: (lead.propertyId as any)?._id ? String((lead.propertyId as any)._id) : propertyId,
          buyerName: name,
        },
        entityType: "lead",
        entityId: String(lead._id),
        link: `/seller/leads?lead=${String(lead._id)}`,
        priority: "high",
        deliveryChannels: ["in_app"],
      });
    } catch (notificationError) {
      console.error("Failed to create lead notification:", notificationError);
    }

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

// GET /leads/:leadId
export async function getLeadById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const lead = await leadService.getLeadById(req.params.leadId, userId);
    return res.status(200).json({ success: true, lead });
  } catch (err) {
    return next(err);
  }
}

// PATCH /leads/:leadId/status
export async function updateLeadStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = req.user?.userId as string;
    if (!sellerId) throw new ApiError(401, "Unauthorized");

    const status = String(req.body?.status || "").trim().toLowerCase();
    if (!["new", "contacted", "visit_scheduled", "negotiating", "reserved", "closed"].includes(status)) {
      throw new ApiError(400, "Invalid lead status");
    }

    const lead = await leadService.updateLeadStatus({
      leadId: req.params.leadId,
      sellerId,
      status: status as "new" | "contacted" | "visit_scheduled" | "negotiating" | "reserved" | "closed",
    });

    return res.status(200).json({ success: true, lead });
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
