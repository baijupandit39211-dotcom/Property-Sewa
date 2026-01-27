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
  listingType?: "buy" | "rent";

  furnishing?: "unfurnished" | "semi" | "full";
  availabilityDate?: Date | null;
  monthlyRent?: number;
  deposit?: number;

  // ✅ NEW
  advanceAmount?: number;

  yearBuilt?: number;
  floor?: number;
  totalFloors?: number;

  facing?: "east" | "west" | "north" | "south";
  roadAccessFt?: number;
  landmark?: string;

  amenities?: string[];

  createdBy: string;
  images: { url: string; publicId: string }[];
};

function toNumberIfPresent(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function validateListing(input: {
  listingType?: "buy" | "rent";
  price?: number;
  monthlyRent?: number;
}) {
  const listingType = input.listingType || "buy";

  if (listingType === "buy") {
    if (!input.price || Number(input.price) <= 0) {
      throw new ApiError(400, "price must be > 0 for sale listings");
    }
  }

  if (listingType === "rent") {
    if (!input.monthlyRent || Number(input.monthlyRent) <= 0) {
      throw new ApiError(400, "monthlyRent must be > 0 for rental listings");
    }
  }

  return listingType;
}

async function createProperty(input: CreatePropertyInput) {
  const { title, location, images } = input;

  if (!title || !location) throw new ApiError(400, "title and location are required");
  if (!images || images.length === 0) throw new ApiError(400, "At least one image is required");

  const listingType = validateListing({
    listingType: input.listingType,
    price: input.price,
    monthlyRent: input.monthlyRent,
  });

  const p = await Property.create({
    ...input,
    listingType,
    status: "pending",
  });

  return p;
}

async function getMyProperties(userId: string, query: any) {
  const q: any = { createdBy: userId };

  if (query?.location) q.location = { $regex: String(query.location), $options: "i" };
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
  if (property.createdBy.toString() !== userId)
    throw new ApiError(403, "You can only delete your own properties");

  await Property.findByIdAndDelete(propertyId);
  return property;
}

async function listApproved(query: any) {
  const q: any = { status: "active" };

  if (query?.location) q.location = { $regex: String(query.location), $options: "i" };
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

  if (property.createdBy.toString() !== userId) {
    throw new ApiError(403, "You can only edit your own properties");
  }

  const allowedFields = [
    "title",
    "description",
    "price",
    "currency",
    "location",
    "address",
    "beds",
    "baths",
    "sqft",
    "propertyType",
    "listingType",

    "furnishing",
    "availabilityDate",
    "monthlyRent",
    "deposit",

    // ✅ NEW
    "advanceAmount",

    "yearBuilt",
    "floor",
    "totalFloors",
    "facing",
    "roadAccessFt",
    "landmark",
    "amenities",
  ];

  allowedFields.forEach((key) => {
    if (updates[key] !== undefined) {
      if (
        [
          "price",
          "beds",
          "baths",
          "sqft",
          "monthlyRent",
          "deposit",
          "advanceAmount",
          "yearBuilt",
          "floor",
          "totalFloors",
          "roadAccessFt",
        ].includes(key)
      ) {
        const n = toNumberIfPresent(updates[key]);
        if (n !== undefined) (property as any)[key] = n;
        return;
      }

      (property as any)[key] = updates[key];
    }
  });

  // ✅ validate after applying (so you can change listingType safely)
  validateListing({
    listingType: (property as any).listingType,
    price: (property as any).price,
    monthlyRent: (property as any).monthlyRent,
  });

  if (updates.images && updates.images.length > 0) {
    property.images = updates.images;
  }

  // reset approval
  property.status = "pending";
  property.approvedBy = null as any;

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
