import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";

type CreatePropertyInput = {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  location: string;
  address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  listingType?: string;
  createdBy: string;
  images: { url: string; publicId: string }[];
};

async function createProperty(input: CreatePropertyInput) {
  const { title, price, location, createdBy, images } = input;

  if (!title || !location) throw new ApiError(400, "title and location are required");
  if (!price || Number(price) <= 0) throw new ApiError(400, "price must be > 0");
  if (!images || images.length === 0) throw new ApiError(400, "At least one image is required");

  const p = await Property.create({
    ...input,
    status: "pending",
  });

  return p;
}

async function getMyProperties(userId: string, query: any) {
  const q: any = { createdBy: userId };

  if (query?.location) {
    q.location = { $regex: String(query.location), $options: "i" };
  }
  if (query?.listingType) q.listingType = query.listingType;
  if (query?.status) q.status = query.status;

  const minPrice = query?.minPrice ? Number(query.minPrice) : null;
  const maxPrice = query?.maxPrice ? Number(query.maxPrice) : null;
  if (minPrice != null || maxPrice != null) {
    q.price = {};
    if (minPrice != null) q.price.$gte = minPrice;
    if (maxPrice != null) q.price.$lte = maxPrice;
  }

  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(24, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Property.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Property.countDocuments(q),
  ]);

  return { items, total, page, limit };
}

async function deleteProperty(propertyId: string, userId: string) {
  const property = await Property.findById(propertyId);
  if (!property) throw new ApiError(404, "Property not found");
  if (property.createdBy.toString() !== userId) throw new ApiError(403, "You can only delete your own properties");

  await Property.findByIdAndDelete(propertyId);
  return property;
}

async function listApproved(query: any) {
  const q: any = { status: "active" };

  if (query?.location) {
    q.location = { $regex: String(query.location), $options: "i" };
  }
  if (query?.listingType) q.listingType = query.listingType;

  const minPrice = query?.minPrice ? Number(query.minPrice) : null;
  const maxPrice = query?.maxPrice ? Number(query.maxPrice) : null;
  if (minPrice != null || maxPrice != null) {
    q.price = {};
    if (minPrice != null) q.price.$gte = minPrice;
    if (maxPrice != null) q.price.$lte = maxPrice;
  }

  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(24, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Property.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Property.countDocuments(q),
  ]);

  return { items, total, page, limit };
}

async function getApprovedById(id: string) {
  const p = await Property.findOne({ _id: id, status: "active" });
  if (!p) throw new ApiError(404, "Property not found");
  return p;
}

async function listPending() {
  return Property.find({ status: "pending" }).sort({ createdAt: -1 });
}

async function approveProperty(id: string, adminUserId: string) {
  const p = await Property.findById(id);
  if (!p) throw new ApiError(404, "Property not found");

  p.status = "active";
  p.approvedBy = adminUserId as any;
  await p.save();
  return p;
}

async function rejectProperty(id: string, adminUserId: string) {
  const p = await Property.findById(id);
  if (!p) throw new ApiError(404, "Property not found");

  p.status = "rejected";
  p.approvedBy = adminUserId as any;
  await p.save();
  return p;
}

async function updateProperty(id: string, userId: string, updates: any) {
  const property = await Property.findById(id);
  if (!property) throw new ApiError(404, "Property not found");
  
  // Ensure only owner can edit
  if (property.createdBy.toString() !== userId) {
    throw new ApiError(403, "You can only edit your own properties");
  }

  // Update fields
  const allowedFields = ['title', 'description', 'price', 'currency', 'location', 'address', 'beds', 'baths', 'sqft', 'propertyType', 'listingType'];
  allowedFields.forEach(key => {
    if (updates[key] !== undefined) {
      (property as any)[key] = updates[key];
    }
  });

  // Handle images if provided
  if (updates.images && updates.images.length > 0) {
    property.images = updates.images;
  }

  // Reset status to pending for re-approval
  property.status = "pending";
  property.approvedBy = undefined;

  await property.save();
  return property;
}

async function getMyPropertyById(id: string, userId: string) {
  const property = await Property.findOne({ _id: id, createdBy: userId });
  if (!property) throw new ApiError(404, "Property not found");
  return property;
}

export default {
  createProperty,
  getMyProperties,
  getMyPropertyById,
  deleteProperty,
  listApproved,
  getApprovedById,
  listPending,
  approveProperty,
  rejectProperty,
  updateProperty,
};
