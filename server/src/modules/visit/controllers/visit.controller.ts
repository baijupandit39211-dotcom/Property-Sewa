import type { NextFunction, Request, Response } from "express";
import Lead from "../../../models/Lead.model";
import Property from "../../../models/Property.model";
import { ApiError } from "../../../utils/apiError";
import notificationService from "../../notifications/services/notification.services";
import visitService from "../services/visit.services";

function requireUser(req: Request) {
  const userId = req.user?.userId as string;
  if (!userId) throw new ApiError(401, "Unauthorized");
  return userId;
}

function ensureBuyer(req: Request) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "buyer") throw new ApiError(403, "Buyer only endpoint");
}

function ensureSeller(req: Request) {
  const role = String(req.user?.role || "").toLowerCase();
  if (!["seller", "agent", "admin", "superadmin"].includes(role)) {
    throw new ApiError(403, "Seller only endpoint");
  }
}

function normalizeDate(value: any) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid date");
  d.setHours(0, 0, 0, 0);
  return d;
}

function extractVisitType(value: any) {
  const normalized = String(value || "in_person").trim().toLowerCase();
  if (!["in_person", "virtual", "site_tour"].includes(normalized)) {
    throw new ApiError(400, "Invalid visitType");
  }
  return normalized as "in_person" | "virtual" | "site_tour";
}

function mapNotificationLink(leadId?: string | null) {
  return leadId ? `/buyer/messages/${leadId}` : "/buyer/scheduled-visits";
}

async function notifyBuyerVisitUpdate(input: {
  buyerId: string;
  actorId: string;
  title: string;
  body: string;
  visitId: string;
  leadId?: string | null;
  propertyId?: string | null;
}) {
  await notificationService.createNotification({
    recipientId: input.buyerId,
    recipientRole: "buyer",
    actorId: input.actorId,
    type: "alert.general",
    category: "alert",
    title: input.title,
    body: input.body,
    data: {
      visitId: input.visitId,
      leadId: input.leadId || null,
      propertyId: input.propertyId || null,
    },
    entityType: "lead",
    entityId: input.leadId || input.visitId,
    link: mapNotificationLink(input.leadId),
    priority: "high",
    deliveryChannels: ["in_app"],
  });
}

// Buyer: POST /api/visits
export async function createVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = requireUser(req);
    ensureBuyer(req);

    const propertyId = String(req.body?.propertyId || "").trim();
    const preferredDateRaw = req.body?.preferredDate || req.body?.requestedDate;
    const preferredTimeSlot = String(
      req.body?.preferredTimeSlot || req.body?.preferredTime || ""
    ).trim();
    const visitType = extractVisitType(req.body?.visitType);
    const buyerMessage = String(req.body?.buyerMessage || req.body?.message || "").trim();
    if (!propertyId || !preferredDateRaw || !preferredTimeSlot) {
      throw new ApiError(400, "propertyId, preferredDate, preferredTimeSlot are required");
    }

    const property = await Property.findById(propertyId).select("createdBy title");
    if (!property) throw new ApiError(404, "Property not found");
    const sellerId = String(property.createdBy);

    const lead = await Lead.findOne({ propertyId, buyerId }).sort({ createdAt: -1 }).lean();

    const visit = await visitService.createVisit({
      propertyId,
      buyerId,
      sellerId,
      leadId: lead ? String(lead._id) : null,
      visitType,
      preferredDate: normalizeDate(preferredDateRaw),
      preferredTimeSlot,
      buyerMessage,
    });

    try {
      await notificationService.createNotification({
        recipientId: sellerId,
        recipientRole: "seller",
        actorId: buyerId,
        type: "alert.general",
        category: "alert",
        title: "New visit request",
        body: `New visit request for ${String(property.title || "property")} on ${normalizeDate(preferredDateRaw).toLocaleDateString()} at ${preferredTimeSlot}.`,
        data: {
          visitId: String((visit as any)._id),
          leadId: lead ? String(lead._id) : null,
          propertyId,
          preferredDate: normalizeDate(preferredDateRaw).toISOString(),
          preferredTimeSlot,
          visitType,
        },
        entityType: "lead",
        entityId: lead ? String(lead._id) : String((visit as any)._id),
        link: lead ? `/seller/leads?lead=${String(lead._id)}` : "/seller/visit-scheduling",
        priority: "high",
        deliveryChannels: ["in_app"],
      });
    } catch {}

    return res.status(201).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// Buyer: GET /api/visits/my
export async function getMyVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = requireUser(req);
    ensureBuyer(req);
    const result = await visitService.getBuyerVisits(buyerId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

// Buyer: GET /api/visits/property/:propertyId/status
export async function getPropertyVisitStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = requireUser(req);
    ensureBuyer(req);
    const visit = await visitService.getVisitStatusForProperty(buyerId, req.params.propertyId);
    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// Buyer: PATCH /api/visits/:id/cancel
export async function cancelMyVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = requireUser(req);
    ensureBuyer(req);
    const visit = await visitService.buyerCancelVisit(req.params.id, buyerId);
    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// Buyer: PATCH /api/visits/:id/request-reschedule
export async function requestVisitReschedule(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = requireUser(req);
    ensureBuyer(req);
    const note = String(req.body?.buyerMessage || req.body?.message || "").trim();
    const visit = await visitService.buyerRequestReschedule(req.params.id, buyerId, note);
    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

// Seller: GET /api/seller/visits OR /api/visits/seller
export async function getSellerVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const sellerId = requireUser(req);
    ensureSeller(req);
    const result = await visitService.getSellerVisits(sellerId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function applySellerStatus(
  req: Request,
  res: Response,
  next: NextFunction,
  status: "confirmed" | "rejected" | "rescheduled" | "completed" | "cancelled"
) {
  try {
    const sellerId = requireUser(req);
    ensureSeller(req);
    const sellerNote = String(req.body?.sellerNote || req.body?.sellerResponse || "").trim();
    const actualDate = req.body?.actualDate ? normalizeDate(req.body.actualDate) : undefined;
    const actualTime = req.body?.actualTime ? String(req.body.actualTime).trim() : undefined;
    const visit = await visitService.sellerUpdateVisit(req.params.id, sellerId, {
      status,
      sellerNote,
      actualDate,
      actualTime,
    });

    try {
      const buyerId = String((visit as any).buyerId?._id || (visit as any).buyerId);
      const leadId = String((visit as any).leadId?._id || (visit as any).leadId || "");
      const propertyId = String((visit as any).propertyId?._id || (visit as any).propertyId || "");
      const titleMap: Record<string, string> = {
        confirmed: "Visit confirmed",
        rejected: "Visit rejected",
        rescheduled: "Visit rescheduled",
        completed: "Visit completed",
        cancelled: "Visit cancelled",
      };
      const bodyMap: Record<string, string> = {
        confirmed: "Your visit request was confirmed by the seller.",
        rejected: "Your visit request was rejected by the seller.",
        rescheduled: "Seller suggested a new visit schedule.",
        completed: "Seller marked this visit as completed.",
        cancelled: "Seller cancelled this visit.",
      };
      await notifyBuyerVisitUpdate({
        buyerId,
        actorId: sellerId,
        title: titleMap[status],
        body: bodyMap[status],
        visitId: String((visit as any)._id),
        leadId,
        propertyId,
      });
    } catch {}

    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

export async function approveVisit(req: Request, res: Response, next: NextFunction) {
  return applySellerStatus(req, res, next, "confirmed");
}

export async function rejectVisit(req: Request, res: Response, next: NextFunction) {
  return applySellerStatus(req, res, next, "rejected");
}

export async function rescheduleVisit(req: Request, res: Response, next: NextFunction) {
  return applySellerStatus(req, res, next, "rescheduled");
}

export async function completeVisit(req: Request, res: Response, next: NextFunction) {
  return applySellerStatus(req, res, next, "completed");
}

export async function cancelVisitBySeller(req: Request, res: Response, next: NextFunction) {
  return applySellerStatus(req, res, next, "cancelled");
}

export async function cancelVisit(req: Request, res: Response, next: NextFunction) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "buyer") return cancelMyVisit(req, res, next);
  return cancelVisitBySeller(req, res, next);
}

// Backward compatible handlers
export async function getBuyerVisits(req: Request, res: Response, next: NextFunction) {
  return getMyVisits(req, res, next);
}

export async function getVisitById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const visit = await visitService.getVisitByIdForUser(req.params.id, userId);
    return res.status(200).json({ success: true, visit });
  } catch (err) {
    return next(err);
  }
}

export async function updateVisit(req: Request, res: Response, next: NextFunction) {
  const status = String(req.body?.status || "").toLowerCase();
  if (status === "confirmed") return approveVisit(req, res, next);
  if (status === "rejected") return rejectVisit(req, res, next);
  if (status === "rescheduled") return rescheduleVisit(req, res, next);
  if (status === "completed") return completeVisit(req, res, next);
  if (status === "cancelled") return cancelVisitBySeller(req, res, next);
  return next(new ApiError(400, "Invalid status"));
}

export async function deleteVisit(req: Request, res: Response, next: NextFunction) {
  return cancelMyVisit(req, res, next);
}

// Backward compatible: POST /visits/lead/:leadId
export async function createVisitFromLead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUser(req);
    const lead = await Lead.findById(req.params.leadId).populate("propertyId");
    if (!lead) throw new ApiError(404, "Lead not found");
    if (!lead.buyerId) throw new ApiError(400, "Lead buyer missing");
    const sellerId = String(lead.sellerId);
    const buyerId = String(lead.buyerId);
    if (userId !== sellerId && userId !== buyerId) {
      throw new ApiError(403, "You can only schedule for your own lead");
    }
    req.body = {
      ...req.body,
      propertyId: String((lead.propertyId as any)?._id || lead.propertyId),
      preferredDate: req.body?.preferredDate || req.body?.requestedDate,
      preferredTimeSlot: req.body?.preferredTimeSlot || req.body?.preferredTime,
      buyerMessage: req.body?.buyerMessage || req.body?.message,
      visitType: req.body?.visitType || "in_person",
    };
    req.user = {
      ...(req.user || ({} as any)),
      userId: buyerId,
      role: "buyer",
    } as any;
    return createVisit(req, res, next);
  } catch (err) {
    return next(err);
  }
}
