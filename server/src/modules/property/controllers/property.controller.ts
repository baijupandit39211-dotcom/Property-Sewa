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

// ✅ reorder uploaded array using coverIndex if you want (safe)
function applyCoverIndexOrder<T>(arr: T[], coverIndexRaw: any) {
  const coverIndex = Number(coverIndexRaw);
  if (!Number.isFinite(coverIndex)) return arr;
  if (coverIndex <= 0) return arr;
  if (coverIndex >= arr.length) return arr;

  const copy = arr.slice();
  const [cover] = copy.splice(coverIndex, 1);
  return [cover, ...copy];
}

// POST /properties (seller/agent) - multipart form-data with images[]
export async function createProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new ApiError(400, "Images are required");

    // upload all first
    const uploadedRaw = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

    // ✅ if FE sends coverIndex, reorder
    const uploaded = applyCoverIndexOrder(uploadedRaw, req.body?.coverIndex);

    const body = req.body || {};
    const listingType = body.listingType || "buy";

    const created = await propertyService.createProperty({
      title: body.title,
      description: body.description,

      // ✅ keep price (sale price OR base price). FE always sends it.
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

      // ✅ NEW
      advanceAmount: toNumber(body.advanceAmount, 0),

      yearBuilt: toNumber(body.yearBuilt, 0),
      floor: toNumber(body.floor, 0),
      totalFloors: toNumber(body.totalFloors, 0),

      facing: body.facing,
      roadAccessFt: toNumber(body.roadAccessFt, 0),
      landmark: body.landmark,

      amenities: parseAmenities(body.amenities),

      createdBy: userId,
      images: uploaded,
    });

    return res.status(201).json({ success: true, property: created });
  } catch (err) {
    return next(err);
  }
}

// GET /properties/mine (seller)
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

// GET /properties/mine/:id (seller)
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

// DELETE /properties/:id (seller)
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

// GET /properties (buyer) approved list
export async function listApproved(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await propertyService.listApproved(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

// GET /properties/:id (buyer) approved details
export async function getApprovedById(req: Request, res: Response, next: NextFunction) {
  try {
    const property = await propertyService.getApprovedById(req.params.id);
    return res.status(200).json({ success: true, property });
  } catch (err) {
    return next(err);
  }
}

// ADMIN: GET /properties/admin/pending
export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await propertyService.listPending();
    return res.status(200).json({ success: true, items });
  } catch (err) {
    return next(err);
  }
}

// ADMIN: PATCH /properties/admin/:id/approve
export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.approveProperty(req.params.id, adminUserId);
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}

// ADMIN: PATCH /properties/admin/:id/reject
export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.rejectProperty(req.params.id, adminUserId);
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}

// PATCH /properties/:id (seller edit own property)
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

    // ✅ numeric normalize (so strings from multipart won't break)
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
