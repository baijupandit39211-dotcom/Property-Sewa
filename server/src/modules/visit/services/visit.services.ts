import Lead from "../../../models/Lead.model";
import Message from "../../../models/Message.model";
import Property from "../../../models/Property.model";
import Visit from "../../../models/Visit.model";
import { ApiError } from "../../../utils/apiError";
import { invalidateAdminDashboardCache } from "../../admin-overview/services/adminOverview.services";

type VisitStatus =
  | "requested"
  | "confirmed"
  | "rescheduled"
  | "rejected"
  | "cancelled"
  | "completed"
  | "no_show";

export interface CreateVisitInput {
  propertyId: string;
  buyerId: string;
  sellerId: string;
  leadId?: string | null;
  visitType?: "in_person" | "virtual" | "site_tour";
  preferredDate: Date;
  preferredTimeSlot: string;
  buyerMessage?: string;
}

export interface SellerVisitActionInput {
  status: VisitStatus;
  sellerNote?: string;
  actualDate?: Date;
  actualTime?: string;
}

const ACTIVE_STATUSES: VisitStatus[] = ["requested", "confirmed", "rescheduled"];

function normalizeDate(dateInput: Date) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toLegacyFields(input: CreateVisitInput) {
  return {
    requestedDate: input.preferredDate,
    preferredTime: input.preferredTimeSlot,
    message: input.buyerMessage || "",
  };
}

function statusToLeadStatus(status: VisitStatus) {
  if (status === "requested" || status === "confirmed" || status === "rescheduled") {
    return "visit_scheduled";
  }
  if (status === "completed") return "closed";
  if (status === "cancelled" || status === "rejected" || status === "no_show") return "contacted";
  return "contacted";
}

async function createVisit(input: CreateVisitInput) {
  const property = await Property.findById(input.propertyId).select("createdBy");
  if (!property) throw new ApiError(404, "Property not found");
  if (String(property.createdBy) !== String(input.sellerId)) {
    throw new ApiError(403, "Property does not belong to this seller");
  }

  const existingActive = await Visit.findOne({
    propertyId: input.propertyId,
    buyerId: input.buyerId,
    status: { $in: ACTIVE_STATUSES },
  }).lean();
  if (existingActive) {
    throw new ApiError(400, "You already have an active visit request for this property");
  }

  const preferredDate = normalizeDate(input.preferredDate);
  const preferredTimeSlot = String(input.preferredTimeSlot || "").trim();
  if (!preferredTimeSlot) throw new ApiError(400, "preferredTimeSlot is required");

  const conflictingVisit = await Visit.findOne({
    propertyId: input.propertyId,
    preferredDate,
    preferredTimeSlot,
    status: { $in: ["requested", "confirmed", "rescheduled"] },
  }).lean();
  if (conflictingVisit) {
    throw new ApiError(400, "Visit already scheduled for this date and time slot");
  }

  const visit = await Visit.create({
    propertyId: input.propertyId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    leadId: input.leadId || null,
    visitType: input.visitType || "in_person",
    preferredDate,
    preferredTimeSlot,
    buyerMessage: input.buyerMessage || "",
    ...toLegacyFields({
      ...input,
      preferredDate,
      preferredTimeSlot,
    }),
    status: "requested",
  });

  if (input.leadId) {
    await Lead.findByIdAndUpdate(input.leadId, { status: "visit_scheduled" }).catch(() => null);
  }

  await visit.populate([
    { path: "propertyId", select: "title location images" },
    { path: "buyerId", select: "name email phone" },
    { path: "sellerId", select: "name email phone" },
    { path: "leadId", select: "_id status" },
  ]);

  await invalidateAdminDashboardCache();

  return visit;
}

async function getBuyerVisits(buyerId: string, query: any = {}) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;
  const filter: any = { buyerId };
  if (query?.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Visit.find(filter)
      .populate([
        { path: "propertyId", select: "title location images" },
        { path: "sellerId", select: "name email phone" },
        { path: "leadId", select: "_id status" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Visit.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

async function getSellerVisits(sellerId: string, query: any = {}) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(200, Math.max(1, Number(query?.limit || 50)));
  const skip = (page - 1) * limit;
  const filter: any = { sellerId };
  if (query?.status) filter.status = query.status;
  if (query?.startDate || query?.endDate) {
    filter.$or = [{ preferredDate: {} }, { requestedDate: {} }];
    if (query?.startDate) {
      const start = normalizeDate(new Date(query.startDate));
      filter.$or[0].preferredDate.$gte = start;
      filter.$or[1].requestedDate.$gte = start;
    }
    if (query?.endDate) {
      const end = normalizeDate(new Date(query.endDate));
      filter.$or[0].preferredDate.$lte = end;
      filter.$or[1].requestedDate.$lte = end;
    }
  }

  const [items, total] = await Promise.all([
    Visit.find(filter)
      .populate([
        { path: "propertyId", select: "title location images" },
        { path: "buyerId", select: "name email phone" },
        { path: "leadId", select: "_id status" },
      ])
      .sort({ preferredDate: 1, preferredTimeSlot: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Visit.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

async function getVisitStatusForProperty(buyerId: string, propertyId: string) {
  const latest = await Visit.findOne({ buyerId, propertyId })
    .sort({ createdAt: -1 })
    .populate([{ path: "leadId", select: "_id status" }]);
  return latest;
}

async function getVisitByIdForUser(id: string, userId: string) {
  const visit = await Visit.findById(id).populate([
    { path: "propertyId", select: "title location images" },
    { path: "buyerId", select: "name email phone" },
    { path: "sellerId", select: "name email phone" },
    { path: "leadId", select: "_id status" },
  ]);
  if (!visit) throw new ApiError(404, "Visit not found");
  const allowed =
    String((visit as any).buyerId?._id || visit.buyerId) === String(userId) ||
    String((visit as any).sellerId?._id || visit.sellerId) === String(userId);
  if (!allowed) throw new ApiError(403, "You can only access your own visits");
  return visit;
}

async function buyerCancelVisit(id: string, buyerId: string) {
  const visit = await Visit.findById(id);
  if (!visit) throw new ApiError(404, "Visit not found");
  if (String(visit.buyerId) !== String(buyerId)) throw new ApiError(403, "Not allowed");
  if (!ACTIVE_STATUSES.includes(visit.status as VisitStatus)) {
    throw new ApiError(400, "Only active requests can be cancelled");
  }
  visit.status = "cancelled" as any;
  visit.cancelledAt = new Date();
  visit.sellerResponse = "Cancelled by buyer";
  visit.sellerNote = "Cancelled by buyer";
  await visit.save();
  await invalidateAdminDashboardCache();
  return getVisitByIdForUser(id, buyerId);
}

async function buyerRequestReschedule(id: string, buyerId: string, note?: string) {
  const visit = await Visit.findById(id);
  if (!visit) throw new ApiError(404, "Visit not found");
  if (String(visit.buyerId) !== String(buyerId)) throw new ApiError(403, "Not allowed");
  if (!["confirmed", "rescheduled", "requested"].includes(String(visit.status))) {
    throw new ApiError(400, "This visit cannot be rescheduled");
  }
  visit.status = "rescheduled" as any;
  if (note) {
    visit.buyerMessage = note;
    visit.message = note;
  }
  await visit.save();
  await invalidateAdminDashboardCache();
  return getVisitByIdForUser(id, buyerId);
}

async function sellerUpdateVisit(id: string, sellerId: string, input: SellerVisitActionInput) {
  const visit = await Visit.findById(id);
  if (!visit) throw new ApiError(404, "Visit not found");
  if (String(visit.sellerId) !== String(sellerId)) throw new ApiError(403, "Not allowed");

  const nextStatus = input.status;
  if (input.actualDate) {
    visit.actualDate = normalizeDate(input.actualDate);
  }
  if (input.actualTime) {
    visit.actualTime = String(input.actualTime || "").trim();
  }
  if (input.sellerNote !== undefined) {
    visit.sellerNote = String(input.sellerNote || "");
    visit.sellerResponse = String(input.sellerNote || "");
  }

  if (nextStatus === "confirmed") {
    visit.status = "confirmed" as any;
    visit.confirmedAt = new Date();
    if (!visit.actualDate) visit.actualDate = visit.preferredDate || visit.requestedDate;
    if (!visit.actualTime) visit.actualTime = visit.preferredTimeSlot || visit.preferredTime;
  } else if (nextStatus === "rescheduled") {
    visit.status = "rescheduled" as any;
    if (!visit.actualDate) visit.actualDate = visit.preferredDate || visit.requestedDate;
    if (!visit.actualTime) visit.actualTime = visit.preferredTimeSlot || visit.preferredTime;
  } else if (nextStatus === "rejected") {
    visit.status = "rejected" as any;
  } else if (nextStatus === "cancelled") {
    visit.status = "cancelled" as any;
    visit.cancelledAt = new Date();
  } else if (nextStatus === "completed") {
    visit.status = "completed" as any;
    visit.completedAt = new Date();
  } else if (nextStatus === "no_show") {
    visit.status = "no_show" as any;
  } else if (nextStatus === "requested") {
    visit.status = "requested" as any;
  }

  visit.preferredDate = visit.preferredDate || visit.requestedDate;
  visit.preferredTimeSlot = visit.preferredTimeSlot || visit.preferredTime;
  visit.requestedDate = visit.preferredDate as Date;
  visit.preferredTime = visit.preferredTimeSlot;

  await visit.save();
  await invalidateAdminDashboardCache();

  if (visit.leadId) {
    await Lead.findByIdAndUpdate(visit.leadId, { status: statusToLeadStatus(nextStatus) }).catch(() => null);
    const chipText =
      nextStatus === "confirmed"
        ? `Visit scheduled for ${new Date(visit.actualDate || visit.requestedDate).toLocaleDateString()} at ${visit.actualTime || visit.preferredTime}.`
        : nextStatus === "rescheduled"
        ? `Visit rescheduled to ${new Date(visit.actualDate || visit.requestedDate).toLocaleDateString()} at ${visit.actualTime || visit.preferredTime}.`
        : nextStatus === "rejected"
        ? "Visit request was rejected."
        : nextStatus === "cancelled"
        ? "Visit was cancelled."
        : nextStatus === "completed"
        ? "Visit marked as completed."
        : nextStatus === "no_show"
        ? "Visit marked as no-show."
        : "Visit request updated.";
    await Message.create({
      leadId: visit.leadId,
      senderId: visit.sellerId,
      senderRole: "seller",
      text: chipText,
      isAutoReply: true,
    }).catch(() => null);
  }

  return getVisitByIdForUser(id, sellerId);
}

export default {
  createVisit,
  getBuyerVisits,
  getSellerVisits,
  getVisitStatusForProperty,
  getVisitByIdForUser,
  buyerCancelVisit,
  buyerRequestReschedule,
  sellerUpdateVisit,
};
