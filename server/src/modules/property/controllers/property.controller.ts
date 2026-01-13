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

// POST /properties (seller/agent) - multipart form-data with images[]
export async function createProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    // multer puts files here
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new ApiError(400, "Images are required");

    const uploaded = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

    const body = req.body || {};

    const created = await propertyService.createProperty({
      title: body.title,
      description: body.description,
      price: Number(body.price),
      currency: body.currency || "USD",
      location: body.location,
      address: body.address,
      beds: Number(body.beds || 0),
      baths: Number(body.baths || 0),
      sqft: Number(body.sqft || 0),
      propertyType: body.propertyType || "house",
      listingType: body.listingType || "buy",
      createdBy: userId,
      images: uploaded,
    });

    return res.status(201).json({ success: true, property: created });
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

// ADMIN:
// GET /admin/properties/pending
export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await propertyService.listPending();
    return res.status(200).json({ success: true, items });
  } catch (err) {
    return next(err);
  }
}

// PATCH /admin/properties/:id/approve
export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.approveProperty(req.params.id, adminUserId);
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}

// PATCH /admin/properties/:id/reject
export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUserId = req.user?.userId as string;
    const updated = await propertyService.rejectProperty(req.params.id, adminUserId);
    return res.status(200).json({ success: true, property: updated });
  } catch (err) {
    return next(err);
  }
}
