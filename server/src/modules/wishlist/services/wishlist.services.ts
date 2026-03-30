import Wishlist from "../../../models/Wishlist.model";
import Property from "../../../models/Property.model";
import { ApiError } from "../../../utils/apiError";

async function addToWishlist(buyerId: string, propertyId: string) {
  const property = await Property.findOne({ _id: propertyId, status: "active" });
  if (!property) throw new ApiError(404, "Property not found");

  await Wishlist.findOneAndUpdate(
    { buyerId, propertyId },
    { $setOnInsert: { buyerId, propertyId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const item = await Wishlist.findOne({ buyerId, propertyId }).populate({
    path: "propertyId",
    select:
      "title description price currency location address beds baths sqft propertyType listingType images status offerCategory offerTitle offerBadge offerActive offerValidUntil createdBy createdAt",
  });

  if (!item) throw new ApiError(500, "Failed to save wishlist item");
  return item;
}

async function removeFromWishlist(buyerId: string, propertyId: string) {
  const deleted = await Wishlist.findOneAndDelete({ buyerId, propertyId });
  return { success: !!deleted };
}

async function getWishlist(buyerId: string, query: any = {}) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(24, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;

  const filter = { buyerId };

  const [items, total] = await Promise.all([
    Wishlist.find(filter)
      .populate({
        path: "propertyId",
        select:
          "title description price currency location address beds baths sqft propertyType listingType images status offerCategory offerTitle offerBadge offerActive offerValidUntil createdBy createdAt",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Wishlist.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

async function isInWishlist(buyerId: string, propertyId: string) {
  const exists = await Wishlist.exists({ buyerId, propertyId });
  return !!exists;
}

export default {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  isInWishlist,
};
