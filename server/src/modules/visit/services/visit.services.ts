import Visit from "../../../models/Visit.model";
import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";

export interface CreateVisitInput {
  propertyId: string;
  buyerId: string;
  sellerId: string;
  requestedDate: Date;
  preferredTime: string;
  message?: string;
}

export interface UpdateVisitInput {
  status?: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  sellerResponse?: string;
  actualDate?: Date;
  actualTime?: string;
}

async function createVisit(input: CreateVisitInput) {
  // Verify property exists and belongs to seller
  const property = await Property.findById(input.propertyId);
  if (!property) throw new ApiError(404, "Property not found");
  
  if (property.createdBy.toString() !== input.sellerId) {
    throw new ApiError(403, "Property does not belong to this seller");
  }

  // Check if visit already exists for same date/time
  const existingVisit = await Visit.findOne({
    propertyId: input.propertyId,
    requestedDate: input.requestedDate,
    preferredTime: input.preferredTime,
    status: { $in: ["requested", "confirmed"] },
  });

  if (existingVisit) {
    throw new ApiError(400, "Visit already scheduled for this date and time");
  }

  const visit = new Visit({
    propertyId: input.propertyId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    requestedDate: input.requestedDate,
    preferredTime: input.preferredTime,
    message: input.message,
  });

  await visit.save();
  
  // Populate related data for response
  await visit.populate([
    { path: "propertyId", select: "title location images" },
    { path: "buyerId", select: "name email phone" },
    { path: "sellerId", select: "name email" },
  ]);

  return visit;
}

async function getVisitsBySeller(sellerId: string, query: any) {
  const {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
    sortBy = "requestedDate",
    sortOrder = "desc",
  } = query;

  const filter: any = { sellerId };
  
  if (status) {
    filter.status = status;
  }
  
  if (startDate || endDate) {
    filter.requestedDate = {};
    if (startDate) {
      // Normalize startDate to midnight local time
      const normalizedStartDate = new Date(startDate);
      normalizedStartDate.setHours(0, 0, 0, 0);
      filter.requestedDate.$gte = normalizedStartDate;
    }
    if (endDate) {
      // Normalize endDate to midnight local time
      const normalizedEndDate = new Date(endDate);
      normalizedEndDate.setHours(0, 0, 0, 0);
      filter.requestedDate.$lte = normalizedEndDate;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort: any = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  const [visits, total] = await Promise.all([
    Visit.find(filter)
      .populate([
        { path: "propertyId", select: "title location images" },
        { path: "buyerId", select: "name email phone" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Visit.countDocuments(filter),
  ]);

  return {
    items: visits,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
}

async function getVisitsByBuyer(buyerId: string, query: any) {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = "requestedDate",
    sortOrder = "desc",
  } = query;

  const filter: any = { buyerId };
  
  if (status) {
    filter.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort: any = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  const [visits, total] = await Promise.all([
    Visit.find(filter)
      .populate([
        { path: "propertyId", select: "title location images" },
        { path: "sellerId", select: "name email" },
      ])
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Visit.countDocuments(filter),
  ]);

  return {
    items: visits,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
}

async function getVisitById(visitId: string, userId: string) {
  const visit = await Visit.findById(visitId)
    .populate([
      { path: "propertyId", select: "title location images" },
      { path: "buyerId", select: "name email phone" },
      { path: "sellerId", select: "name email" },
    ]);

  if (!visit) throw new ApiError(404, "Visit not found");

  // Verify user owns this visit (either buyer or seller)
  if (visit.buyerId.toString() !== userId && visit.sellerId.toString() !== userId) {
    throw new ApiError(403, "You can only access your own visits");
  }

  return visit;
}

async function updateVisit(visitId: string, userId: string, updates: UpdateVisitInput) {
  const visit = await Visit.findById(visitId);
  if (!visit) throw new ApiError(404, "Visit not found");

  // Verify user owns this visit (only seller can update)
  if (visit.sellerId.toString() !== userId) {
    throw new ApiError(403, "Only seller can update visit details");
  }

  // Update visit
  Object.assign(visit, updates);
  await visit.save();

  // Populate related data for response
  await visit.populate([
    { path: "propertyId", select: "title location images" },
    { path: "buyerId", select: "name email phone" },
    { path: "sellerId", select: "name email" },
  ]);

  return visit;
}

async function deleteVisit(visitId: string, userId: string) {
  const visit = await Visit.findById(visitId);
  if (!visit) throw new ApiError(404, "Visit not found");

  // Only buyer can delete their own requested visits
  if (visit.buyerId.toString() !== userId) {
    throw new ApiError(403, "Only buyer can delete their own visit requests");
  }

  // Only allow deletion of requested visits
  if (visit.status !== "requested") {
    throw new ApiError(400, "Cannot delete visit that is already processed");
  }

  await Visit.findByIdAndDelete(visitId);
  return { success: true };
}

export default {
  createVisit,
  getVisitsBySeller,
  getVisitsByBuyer,
  getVisitById,
  updateVisit,
  deleteVisit,
};
