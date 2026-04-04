import Wishlist from "../../../models/Wishlist.model";
import Property from "../../../models/Property.model";
import { ApiError } from "../../../utils/apiError";
import { isPropertyVisibleToViewer } from "../../property/services/property.services";
import { expireStalePropertyReservations } from "../../property/utils/reservation.utils";

const PROPERTY_SELECT =
  "title description price currency location address beds baths sqft propertyType listingType images status offerCategory offerTitle offerBadge offerActive offerValidUntil createdBy createdAt approvedBy reservationType reservationStatus reservedBy reservedAt reservationExpiresAt reservedUntil";

async function addToWishlist(buyerId: string, propertyId: string) {
  await expireStalePropertyReservations();

  const property = await Property.findById(propertyId);
  if (!property || !isPropertyVisibleToViewer(property, { userId: buyerId, role: "buyer" })) {
    throw new ApiError(404, "Property not found");
  }

  await Wishlist.findOneAndUpdate(
    { buyerId, propertyId },
    { $setOnInsert: { buyerId, propertyId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const item = await Wishlist.findOne({ buyerId, propertyId }).populate({
    path: "propertyId",
    select: PROPERTY_SELECT,
  });

  if (!item) throw new ApiError(500, "Failed to save wishlist item");
  if (!isPropertyVisibleToViewer((item as any).propertyId, { userId: buyerId, role: "buyer" })) {
    throw new ApiError(404, "Property not found");
  }
  return item;
}

async function removeFromWishlist(buyerId: string, propertyId: string) {
  const deleted = await Wishlist.findOneAndDelete({ buyerId, propertyId });
  return { success: !!deleted };
}

async function getWishlist(buyerId: string, query: any = {}) {
  await expireStalePropertyReservations();

  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(24, Math.max(1, Number(query?.limit || 12)));
  const skip = (page - 1) * limit;

  const filter = { buyerId };

  const items = await Wishlist.find(filter)
    .populate({
      path: "propertyId",
      select: PROPERTY_SELECT,
    })
    .sort({ createdAt: -1 });

  const visibleItems = items.filter((item: any) =>
    isPropertyVisibleToViewer(item?.propertyId, { userId: buyerId, role: "buyer" })
  );

  return {
    items: visibleItems.slice(skip, skip + limit),
    total: visibleItems.length,
    page,
    limit,
  };
}

async function isInWishlist(buyerId: string, propertyId: string) {
  await expireStalePropertyReservations();

  const property = await Property.findById(propertyId);
  if (!property || !isPropertyVisibleToViewer(property, { userId: buyerId, role: "buyer" })) {
    return false;
  }

  const exists = await Wishlist.exists({ buyerId, propertyId });
  return !!exists;
}

export default {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  isInWishlist,
};
