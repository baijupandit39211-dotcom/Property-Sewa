import Property from "../../../models/Property.model";
import Lead from "../../../models/Lead.model";
import Visit from "../../../models/Visit.model";
import Message from "../../../models/Message.model";
import { ApiError } from "../../../utils/apiError";

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
  status: "new" | "contacted" | "closed";
}

async function enrichLead(lead: any) {
  const [lastMessage, messageCount, latestVisit] = await Promise.all([
    Message.findOne({ leadId: lead._id })
      .populate({
        path: "senderId",
        select: "name email",
      })
      .sort({ createdAt: -1 })
      .lean(),
    Message.countDocuments({ leadId: lead._id }),
    lead.buyerId
      ? Visit.findOne({
          buyerId: lead.buyerId,
          propertyId: lead.propertyId?._id || lead.propertyId,
        })
          .sort({ createdAt: -1 })
          .lean()
      : null,
  ]);

  const leadObject = typeof lead.toObject === "function" ? lead.toObject() : lead;

  return {
    ...leadObject,
    lastMessage,
    messageCount,
    latestActivityAt: lastMessage?.createdAt || leadObject.createdAt,
    latestVisit,
  };
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
    .sort({ createdAt: -1 });

  const enriched = await Promise.all(leads.map((lead) => enrichLead(lead)));
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
    .sort({ createdAt: -1 });

  // For each lead, find the most recent visit for that property
  const leadsWithVisitStatus = await Promise.all(
    leads.map(async (lead) => {
      try {
        // Find the most recent visit for this buyer and property
        const latestVisit = await Visit.findOne({
          buyerId: buyerId,
          propertyId: lead.propertyId._id
        })
        .sort({ createdAt: -1 });

        // Convert lead to plain object and add visit info
        const leadObj: any = lead.toObject();
        if (latestVisit) {
          leadObj.latestVisitStatus = latestVisit.status;
          leadObj.latestVisitDate = latestVisit.createdAt;
        }
        
        return leadObj;
      } catch (err) {
        // If visit lookup fails, return lead without visit info
        return lead.toObject();
      }
    })
  );

  return leadsWithVisitStatus;
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
    });

  if (!lead) {
    throw new ApiError(404, "Lead not found");
  }

  const ownsLead =
    lead.sellerId.toString() === userId || lead.buyerId?._id?.toString() === userId || lead.buyerId?.toString?.() === userId;

  if (!ownsLead) {
    throw new ApiError(403, "You can only access your own leads");
  }

  return enrichLead(lead);
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

  return getLeadById(String(lead._id), input.sellerId);
}

export default {
  createLead,
  getLeadsBySeller,
  getLeadsByBuyer,
  getLeadById,
  updateLeadStatus,
};
