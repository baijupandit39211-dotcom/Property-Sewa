import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";
import User from "../../../models/User.model";
import Reservation from "../../../models/Reservation.model";
import { calcAdvanceAmount } from "../../payments/services/payment.services";
import {
  PROPERTY_RESERVATION_WINDOW_MS,
  assignPropertyReservation,
  expirePropertyReservationIfNeeded,
  getReservationBuyerId,
  isReservationActive,
  isReservationPaid,
} from "../../property/utils/reservation.utils";

type CreateCodReservationInput = {
  propertyId: string;
  userId: string;
  fullName: string;
  phone: string;
  message?: string;
  preferredVisitDate?: string | Date | null;
};

export async function listBuyerReservations(userId: string) {
  if (!userId) throw new ApiError(401, "Unauthorized");

  const reservations = await Reservation.find({ userId })
    .populate(
      "propertyId",
      "title location address price currency advanceAmount reservationType reservationStatus reservedAt reservationExpiresAt reservedUntil listingType monthlyRent deposit"
    )
    .sort({ createdAt: -1 });

  return reservations;
}

function toDateOrNull(v: any) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createCodReservation(input: CreateCodReservationInput) {
  const { propertyId, userId, fullName, phone, message, preferredVisitDate } = input;

  if (!propertyId) throw new ApiError(400, "propertyId is required");
  if (!fullName) throw new ApiError(400, "fullName is required");
  if (!phone) throw new ApiError(400, "phone is required");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(401, "User not found");

  const property = await Property.findOne({ _id: propertyId, status: "active" });
  if (!property) throw new ApiError(404, "Property not found");

  await expirePropertyReservationIfNeeded(property);

  if (isReservationActive(property) && getReservationBuyerId(property) !== String(userId)) {
    throw new ApiError(409, "This property is already reserved/booked.");
  }
  if (isReservationActive(property) && getReservationBuyerId(property) === String(userId)) {
    throw new ApiError(409, "You have already reserved this property for the current 1-hour window.");
  }
  if (isReservationPaid(property) && getReservationBuyerId(property) !== String(userId)) {
    throw new ApiError(409, "This property is already reserved/booked.");
  }
  if (isReservationPaid(property) && getReservationBuyerId(property) === String(userId)) {
    throw new ApiError(409, "You have already completed reservation for this property.");
  }

  const advanceAmount = calcAdvanceAmount(property);
  if (!advanceAmount || advanceAmount <= 0) {
    throw new ApiError(400, "Booking advance is not configured for this property.");
  }

  const bookingAdvancePaisa = Math.round(Number(advanceAmount) * 100);
  const reservedAt = new Date();
  const holdExpiresAt = new Date(reservedAt.getTime() + PROPERTY_RESERVATION_WINDOW_MS);

  const reservation = await Reservation.create({
    propertyId,
    userId,
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    reservationStatus: "REQUESTED",
    bookingAdvancePaisa,
    holdExpiresAt,
    contactSnapshot: {
      fullName,
      phone,
      message: message || "",
      preferredVisitDate: toDateOrNull(preferredVisitDate),
    },
  });

  assignPropertyReservation(property, {
    buyerId: userId,
    type: "COD",
    reservedAt,
    expiresAt: holdExpiresAt,
    status: "active",
  });
  await property.save();

  return reservation;
}
