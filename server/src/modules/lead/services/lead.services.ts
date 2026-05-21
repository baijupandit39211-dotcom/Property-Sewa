import Property from "../../../models/Property.model";
import Lead from "../../../models/Lead.model";
import Visit from "../../../models/Visit.model";
import Message from "../../../models/Message.model";
import { ApiError } from "../../../utils/apiError";
import { Types } from "mongoose";
import { invalidateAdminDashboardCache } from "../../admin-overview/services/adminOverview.services";

export interface CreateLeadInput {
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  buyerId?: string;
}

export interface UpdateLeadStatusInput {
  leadId: string;
  sellerId: string;
  status: "new" | "contacted" | "visit_scheduled" | "negotiating" | "reserved" | "closed";
}

async function enrichLeadsBatch(leads: any[]) {
  if (!leads.length) return [];

  const leadObjects = leads.map((lead) =>
    typeof lead.toObject === "function" ? lead.toObject() : lead
  );
  const leadIds = leadObjects.map((lead) => String(lead._id));
  const leadObjectIds = leadIds.map((id) => new Types.ObjectId(id));

  const messageSummaries = await Message.aggregate([
    { $match: { leadId: { $in: leadObjectIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$leadId",
        lastMessageId: { $first: "$_id" },
        messageCount: { $sum: 1 },
      },
    },
  ]);

  const lastMessageIds = messageSummaries
    .map((row: any) => row.lastMessageId)
    .filter(Boolean);

  const lastMessages = await Message.find({ _id: { $in: lastMessageIds } })
    .populate({ path: "senderId", select: "name email" })
    .lean();

  const lastMessageById = new Map(
    lastMessages.map((message: any) => [String(message._id), message])
  );

  const messageSummaryByLead = new Map(
    messageSummaries.map((row: any) => [
      String(row._id),
      {
        messageCount: Number(row.messageCount || 0),
        lastMessage: row.lastMessageId ? lastMessageById.get(String(row.lastMessageId)) || null : null,
      },
    ])
  );

  const visitQueryPairs = leadObjects
    .map((lead) => {
      const buyerId = lead.buyerId?._id || lead.buyerId || null;
      const propertyId = lead.propertyId?._id || lead.propertyId || null;
      if (!buyerId || !propertyId) return null;
      return {
        buyerId: new Types.ObjectId(String(buyerId)),
        propertyId: new Types.ObjectId(String(propertyId)),
      };
    })
    .filter(Boolean) as Array<{ buyerId: Types.ObjectId; propertyId: Types.ObjectId }>;

  const latestVisits = visitQueryPairs.length
    ? await Visit.aggregate([
        {
          $match: {
            $or: visitQueryPairs.map((pair) => ({
              buyerId: pair.buyerId,
              propertyId: pair.propertyId,
            })),
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { buyerId: "$buyerId", propertyId: "$propertyId" },
            visit: { $first: "$$ROOT" },
          },
        },
      ])
    : [];

  const latestVisitByPair = new Map(
    latestVisits.map((row: any) => [
      `${String(row._id.buyerId)}:${String(row._id.propertyId)}`,
      row.visit,
    ])
  );

  return leadObjects.map((lead) => {
    const leadId = String(lead._id);
    const summary = messageSummaryByLead.get(leadId) || { messageCount: 0, lastMessage: null };
    const buyerId = String(lead.buyerId?._id || lead.buyerId || "");
    const propertyId = String(lead.propertyId?._id || lead.propertyId || "");
    const latestVisit = buyerId && propertyId ? latestVisitByPair.get(`${buyerId}:${propertyId}`) || null : null;

    return {
      ...lead,
      lastMessage: summary.lastMessage,
      messageCount: summary.messageCount,
      latestActivityAt: summary.lastMessage?.createdAt || lead.createdAt,
      latestVisit,
    };
  });
}

async function createLead(input: CreateLeadInput) {
  // Validate property exists and get seller info
  const property = await Property.findById(input.propertyId);
  if (!property) throw new ApiError(404, "Property not found");

  const lead = new Lead({
    propertyId: input.propertyId,
    sellerId: property.createdBy,
    buyerId: input.buyerId || null,
    name: input.name,
    email: input.email,
    phone: input.phone || "",
    message: input.message,
    status: "new",
  });

  await lead.save();
  await invalidateAdminDashboardCache();

  // Populate property info for response
  await lead.populate({
    path: "propertyId",
    select: "title location"
  });

  return lead;
}

async function getLeadsBySeller(sellerId: string) {
  const leads = await Lead.find({ sellerId })
    .populate({
      path: "propertyId",
      select: "title location images price currency listingType status"
    })
    .populate({
      path: "buyerId",
      select: "name email phone"
    })
    .sort({ createdAt: -1 })
    .lean();

  const enriched = await enrichLeadsBatch(leads);
  enriched.sort(
    (left, right) =>
      new Date(right.latestActivityAt).getTime() - new Date(left.latestActivityAt).getTime()
  );

  return enriched;
}

async function getLeadsByBuyer(buyerId: string) {
  const leads = await Lead.find({ buyerId })
    .populate({
      path: "propertyId",
      select: "title location"
    })
    .sort({ createdAt: -1 })
    .lean();

  const propertyIds = leads
    .map((lead: any) => String(lead?.propertyId?._id || ""))
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  if (!propertyIds.length) return leads;

  const latestVisits = await Visit.aggregate([
    {
      $match: {
        buyerId: new Types.ObjectId(buyerId),
        propertyId: { $in: propertyIds },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$propertyId",
        visit: { $first: "$$ROOT" },
      },
    },
  ]);

  const latestVisitByProperty = new Map(
    latestVisits.map((row: any) => [String(row._id), row.visit])
  );

  return leads.map((lead: any) => {
    const propertyId = String(lead?.propertyId?._id || "");
    const latestVisit = latestVisitByProperty.get(propertyId);
    if (!latestVisit) return lead;
    return {
      ...lead,
      latestVisitStatus: latestVisit.status,
      latestVisitDate: latestVisit.createdAt,
    };
  });
}

async function getLeadById(leadId: string, userId: string) {
  const lead = await Lead.findById(leadId)
    .populate({
      path: "propertyId",
      select: "title location images price currency listingType status"
    })
    .populate({
      path: "buyerId",
      select: "name email phone"
    })
    .lean();

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const ownsLead =
    lead.sellerId.toString() === userId || lead.buyerId?._id?.toString() === userId || lead.buyerId?.toString?.() === userId;

  if (!ownsLead) {
    throw new ApiError(403, "You can only access your own leads");
  }

  const [enriched] = await enrichLeadsBatch([lead]);
  return enriched;
}

async function updateLeadStatus(input: UpdateLeadStatusInput) {
  const lead = await Lead.findById(input.leadId);
  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  if (lead.sellerId.toString() !== input.sellerId) {
    throw new ApiError(403, "Only the seller can update lead status");
  }

  lead.status = input.status;
  await lead.save();
  await invalidateAdminDashboardCache();

  return getLeadById(String(lead._id), input.sellerId);
}

export default {
  createLead,
  getLeadsBySeller,
  getLeadsByBuyer,
  getLeadById,
  updateLeadStatus,
};

