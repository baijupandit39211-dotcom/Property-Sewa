import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";
import { Types, type SortOrder } from "mongoose";

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

  advanceAmount?: number;

  yearBuilt?: number;
  floor?: number;
  totalFloors?: number;

  facing?: "east" | "west" | "north" | "south";
  roadAccessFt?: number;
  landmark?: string;
  offerCategory?: "none" | "dashain" | "latest" | "hot" | "limited_time";
  offerTitle?: string;
  offerDescription?: string;
  offerBadge?: string;
  offerDiscountType?: "none" | "percentage" | "fixed";
  offerDiscountValue?: number;
  offerValidUntil?: Date | null;
  offerActive?: boolean;

  amenities?: string[];

  createdBy: string;
  images: { url: string; publicId: string }[];
};

function toNumberIfPresent(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildApprovedSort(sort?: string): Record<string, SortOrder> {
  const value = String(sort || "").trim().toLowerCase();
  if (value === "price_asc") return { price: 1, createdAt: -1 };
  if (value === "price_desc") return { price: -1, createdAt: -1 };
  return { createdAt: -1, _id: -1 };
}

function buildApprovedVisibilityQuery() {
  return {
    status: "active",
    approvedBy: { $ne: null },
  } as const;
}

function buildActiveOfferQuery(now = new Date()) {
  return {
    offerActive: true,
    $or: [
      { offerValidUntil: null },
      { offerValidUntil: { $gte: now } },
    ],
    $and: [
      {
        $or: [
          { offerCategory: { $exists: true, $ne: "none" } },
          { offerTitle: { $exists: true, $nin: ["", null] } },
          { offerBadge: { $exists: true, $nin: ["", null] } },
          { offerDiscountValue: { $gt: 0 } },
        ],
      },
    ],
  } as const;
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
    Property.find(q)
      .populate("createdBy", "name phone email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
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
  const q: any = { ...buildApprovedVisibilityQuery() };
  const offersOnly = String(query?.offersOnly || "").trim().toLowerCase();
  const search = String(query?.search || "").trim();
  const ids = String(query?.ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => Types.ObjectId.isValid(id));

  if (ids.length > 0) {
    q._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    q.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { location: { $regex: safeSearch, $options: "i" } },
      { address: { $regex: safeSearch, $options: "i" } },
      { propertyType: { $regex: safeSearch, $options: "i" } },
      { landmark: { $regex: safeSearch, $options: "i" } },
      { amenities: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (query?.location) q.location = { $regex: String(query.location), $options: "i" };
  if (query?.listingType) q.listingType = query.listingType;
  if (offersOnly === "true" || offersOnly === "1" || offersOnly === "yes") {
    Object.assign(q, buildActiveOfferQuery());
  }

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
    Property.find(q)
      .populate("createdBy", "name phone email role")
      .sort(buildApprovedSort(query?.sort))
      .skip(skip)
      .limit(limit),
    Property.countDocuments(q),
  ]);

  return { items, total, page, limit };
}

async function getApprovedById(id: string) {
  const p = await Property.findOne({ _id: id, ...buildApprovedVisibilityQuery() }).populate(
    "createdBy",
    "name phone email role"
  );

  if (!p) throw new ApiError(404, "Property not found");
  return p;
}

// ✅ NEW: preview any status if owner (or admin in middleware can call too)
async function previewById(id: string, userId: string) {
  const p = await Property.findById(id).populate("createdBy", "name phone email role");
  if (!p) throw new ApiError(404, "Property not found");

  // owner can preview any status
  if (p.createdBy && (p.createdBy as any)._id) {
    const ownerId = String((p.createdBy as any)._id);
    if (ownerId === String(userId)) return p;
  } else {
    // fallback if not populated for some reason
    if (String(p.createdBy) === String(userId)) return p;
  }

  // not owner → block
  throw new ApiError(403, "You are not allowed to preview this property");
}

function buildPendingSort(sort?: string): Record<string, SortOrder> {
  const value = String(sort || "newest").toLowerCase();
  if (value === "oldest") return { createdAt: 1 };
  if (value === "price_low") return { price: 1, createdAt: -1 };
  if (value === "price_high") return { price: -1, createdAt: -1 };
  return { createdAt: -1 };
}

async function listPending(query: any = {}) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;

  const filter: any = { status: "pending" };
  const search = String(query?.search || "").trim();
  const listingType = String(query?.listingType || "").trim().toLowerCase();
  const propertyType = String(query?.propertyType || "").trim().toLowerCase();

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
    ];
  }

  if (listingType && listingType !== "all") {
    filter.listingType = listingType;
  }

  if (propertyType && propertyType !== "all") {
    filter.propertyType = propertyType;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [items, total, totalPending, activeCount, rejectedCount, buyCount, rentCount, recentCount, byTypeRaw] =
    await Promise.all([
      Property.find(filter)
        .populate("createdBy", "name phone email role")
        .sort(buildPendingSort(query?.sort))
        .skip(skip)
        .limit(limit),
      Property.countDocuments(filter),
      Property.countDocuments({ status: "pending" }),
      Property.countDocuments({ status: "active" }),
      Property.countDocuments({ status: "rejected" }),
      Property.countDocuments({ status: "pending", listingType: "buy" }),
      Property.countDocuments({ status: "pending", listingType: "rent" }),
      Property.countDocuments({ status: "pending", createdAt: { $gte: sevenDaysAgo } }),
      Property.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: "$propertyType", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
    ]);

  return {
    items,
    total,
    page,
    limit,
    stats: {
      totalPending,
      active: activeCount,
      rejected: rejectedCount,
      buy: buyCount,
      rent: rentCount,
      recent: recentCount,
      byType: byTypeRaw.map((row: any) => ({
        type: String(row?._id || "other"),
        count: Number(row?.count || 0),
      })),
    },
  };
}

async function listAllForAdmin(query: any = {}) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;

  const filter: any = {};
  const search = String(query?.search || "").trim();
  const listingType = String(query?.listingType || "").trim().toLowerCase();
  const propertyType = String(query?.propertyType || "").trim().toLowerCase();
  const status = String(query?.status || "").trim().toLowerCase();

  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { location: { $regex: safeSearch, $options: "i" } },
      { address: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (listingType && listingType !== "all") {
    filter.listingType = listingType;
  }

  if (propertyType && propertyType !== "all") {
    filter.propertyType = propertyType;
  }

  if (status && status !== "all") {
    filter.status = status;
  }

  const [items, total, totals] = await Promise.all([
    Property.find(filter)
      .populate("createdBy", "name email phone role")
      .sort(buildPendingSort(query?.sort))
      .skip(skip)
      .limit(limit),
    Property.countDocuments(filter),
    Promise.all([
      Property.countDocuments({}),
      Property.countDocuments({ status: "active" }),
      Property.countDocuments({ status: "pending" }),
      Property.countDocuments({ status: "rejected" }),
      Property.countDocuments({ status: "draft" }),
    ]),
  ]);

  return {
    items,
    total,
    page,
    limit,
    stats: {
      total: totals[0],
      active: totals[1],
      pending: totals[2],
      rejected: totals[3],
      draft: totals[4],
    },
  };
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

async function restoreProperty(id: string, adminUserId: string) {
  const p = await Property.findById(id);
  if (!p) throw new ApiError(404, "Property not found");

  p.status = "active";
  p.approvedBy = adminUserId as any;
  await p.save();
  return p;
}

async function adminDeleteProperty(id: string) {
  const property = await Property.findById(id);
  if (!property) throw new ApiError(404, "Property not found");

  await Property.findByIdAndDelete(id);
  return property;
}

async function adminUpdateStatus(id: string, status: string, adminUserId: string) {
  const property = await Property.findById(id);
  if (!property) throw new ApiError(404, "Property not found");

  const normalized = String(status || "").trim().toLowerCase();
  if (!["pending", "active", "rejected", "draft"].includes(normalized)) {
    throw new ApiError(400, "Invalid property status");
  }

  property.status = normalized as any;
  property.approvedBy = normalized === "draft" ? (null as any) : (adminUserId as any);
  await property.save();
  return property;
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

    "advanceAmount",

    "yearBuilt",
    "floor",
    "totalFloors",
    "facing",
    "roadAccessFt",
    "landmark",
    "amenities",
    "offerCategory",
    "offerTitle",
    "offerDescription",
    "offerBadge",
    "offerDiscountType",
    "offerDiscountValue",
    "offerValidUntil",
    "offerActive",
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
          "offerDiscountValue",
        ].includes(key)
      ) {
        const n = toNumberIfPresent(updates[key]);
        if (n !== undefined) (property as any)[key] = n;
        return;
      }

      (property as any)[key] = updates[key];
    }
  });

  validateListing({
    listingType: (property as any).listingType,
    price: (property as any).price,
    monthlyRent: (property as any).monthlyRent,
  });

  if (updates.images && updates.images.length > 0) {
    property.images = updates.images;
  }

  // reset approval after edit
  property.status = "pending";
  property.approvedBy = null as any;

  await property.save();
  return property;
}

async function getMyPropertyById(id: string, userId: string) {
  const property = await Property.findOne({ _id: id, createdBy: userId }).populate(
    "createdBy",
    "name phone email role"
  );
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
  previewById,
  listPending,
  listAllForAdmin,
  approveProperty,
  rejectProperty,
  restoreProperty,
  adminDeleteProperty,
  adminUpdateStatus,
  updateProperty,
};
