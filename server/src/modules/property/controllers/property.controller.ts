import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import propertyService from "../services/property.services";
import cloudinary from "../../../config/cloudinary";

async function uploadToCloudinary(buffer: Buffer) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "property-sewa/properties" },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

function parseAmenities(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      return [String(value)].filter(Boolean);
    } catch {
      if (value.includes(",")) return value.split(",").map((x) => x.trim()).filter(Boolean);
      return [String(value)].filter(Boolean);
    }
  }

  return [];
}

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toDateOrNull(v: any) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toBoolean(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return false;
}

function applyCoverIndexOrder<T>(arr: T[], coverIndexRaw: any) {
  const coverIndex = Number(coverIndexRaw);
  if (!Number.isFinite(coverIndex)) return arr;
  if (coverIndex <= 0) return arr;
  if (coverIndex >= arr.length) return arr;

  const copy = arr.slice();
  const [cover] = copy.splice(coverIndex, 1);
  return [cover, ...copy];
}

// POST /properties
export async function createProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new ApiError(400, "Images are required");

    const uploadedRaw = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
    const uploaded = applyCoverIndexOrder(uploadedRaw, req.body?.coverIndex);

    const body = req.body || {};
    const listingType = body.listingType || "buy";

    const created = await propertyService.createProperty({
      title: body.title,
      description: body.description,

      price: toNumber(body.price, 0),
      currency: body.currency || body.currentcy || "USD",

      location: body.location,
      address: body.address,

      beds: toNumber(body.beds, 0),
      baths: toNumber(body.baths, 0),
      sqft: toNumber(body.sqft, 0),

      propertyType: body.propertyType || "house",
      listingType,

      furnishing: body.furnishing,
      availabilityDate: toDateOrNull(body.availabilityDate),
      monthlyRent: toNumber(body.monthlyRent, 0),
      deposit: toNumber(body.deposit, 0),

      advanceAmount: toNumber(body.advanceAmount, 0),

      yearBuilt: toNumber(body.yearBuilt, 0),
      floor: toNumber(body.floor, 0),
      totalFloors: toNumber(body.totalFloors, 0),

      facing: body.facing,
      roadAccessFt: toNumber(body.roadAccessFt, 0),
      landmark: body.landmark,
      offerCategory: body.offerCategory || "none",
      offerTitle: body.offerTitle,
      offerDescription: body.offerDescription,
      offerBadge: body.offerBadge,
      offerDiscountType: body.offerDiscountType || "none",
      offerDiscountValue: toNumber(body.offerDiscountValue, 0),
      offerValidUntil: toDateOrNull(body.offerValidUntil),
      offerActive: toBoolean(body.offerActive),

      amenities: parseAmenities(body.amenities),

      createdBy: userId,
      images: uploaded,
    });

    // ✅ return property id reliably (frontend already handles response.property._id)
    return res.status(201).json({ success: true, property: created });
  } catch (err) {
    return next(err);
  }
}

// GET /properties/mine
export async function getMyProperties(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const result = await propertyService.getMyProperties(userId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

// GET /properties/mine/:id
export async function getMyPropertyById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const property = await propertyService.getMyPropertyById(req.params.id, userId);
    return res.status(200).json({ success: true, property });
  } catch (err) {
    return next(err);
  }
}

// ✅ GET /properties/preview/:id (seller preview pending)
export async function previewById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const property = await propertyService.previewById(req.params.id, userId);
    return res.status(200).json({ success: true, property });
  } catch (err) {
    return next(err);
  }
}

// DELETE /properties/:id
export async function deleteProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    const propertyId = req.params.id;

    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!propertyId) throw new ApiError(400, "Property ID is required");

    const deleted = await propertyService.deleteProperty(propertyId, userId);
    return res.status(200).json({ success: true, property: deleted });
  } catch (err) {
    return next(err);
  }
}

// GET /properties (buyer list approved)
export async function listApproved(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await propertyService.listApproved(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

// GET /properties/:id (buyer approved)
export async function getApprovedById(req: Request, res: Response, next: NextFunction) {
  try {
    const property = await propertyService.getApprovedById(req.params.id);
    return res.status(200).json({ success: true, property });
  } catch (err) {
    return next(err);
  }
}

// ADMIN
export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await propertyService.listPending(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function listAllForAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await propertyService.listAllForAdmin(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.approveProperty(req.params.id, adminUserId);
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.rejectProperty(req.params.id, adminUserId);
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}

export async function adminDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const deleted = await propertyService.adminDeleteProperty(req.params.id);
    return res.status(200).json({ success: true, property: deleted });
  } catch (err) {
    return next(err);
  }
}

export async function adminUpdateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.adminUpdateStatus(
      req.params.id,
      req.body?.status,
      adminUserId
    );
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}

// PATCH /properties/:id
export async function updateProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const files = (req.files as Express.Multer.File[]) || [];
    let uploaded: { url: string; publicId: string }[] = [];

    if (files.length > 0) {
      const raw = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
      uploaded = applyCoverIndexOrder(raw, req.body?.coverIndex);
    }

    const updates: any = { ...req.body };

    if (updates.currency === undefined && updates.currentcy !== undefined) {
      updates.currency = updates.currentcy;
    }
    if (updates.amenities !== undefined) {
      updates.amenities = parseAmenities(updates.amenities);
    }
    if (updates.availabilityDate !== undefined) {
      updates.availabilityDate = toDateOrNull(updates.availabilityDate);
    }
    if (updates.offerValidUntil !== undefined) {
      updates.offerValidUntil = toDateOrNull(updates.offerValidUntil);
    }
    if (updates.offerActive !== undefined) {
      updates.offerActive = toBoolean(updates.offerActive);
    }

    const numericKeys = [
      "price",
      "beds",
      "baths",
      "sqft",
      "monthlyRent",
      "deposit",
      "yearBuilt",
      "floor",
      "totalFloors",
      "roadAccessFt",
      "advanceAmount",
      "offerDiscountValue",
    ];
    for (const k of numericKeys) {
      if (updates[k] !== undefined) updates[k] = toNumber(updates[k], 0);
    }

    const updated = await propertyService.updateProperty(req.params.id, userId, {
      ...updates,
      images: uploaded.length > 0 ? uploaded : undefined,
    });

    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}
