import Property from "../../../models/Property.model";
import Lead from "../../../models/Lead.model";
import { ApiError } from "../../../utils/apiError";

export interface CreateLeadInput {
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  buyerId?: string;
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
      select: "title location"
    })
    .sort({ createdAt: -1 });

  return leads;
}

async function getLeadsByBuyer(buyerId: string) {
  const leads = await Lead.find({ buyerId })
    .populate({
      path: "propertyId",
      select: "title location"
    })
    .sort({ createdAt: -1 });

  return leads;
}

export default {
  createLead,
  getLeadsBySeller,
  getLeadsByBuyer,
};
