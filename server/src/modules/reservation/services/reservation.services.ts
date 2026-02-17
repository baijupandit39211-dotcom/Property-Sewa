import { ApiError } from "../../../utils/apiError";
import Property from "../../../models/Property.model";
import User from "../../../models/User.model";
import Reservation from "../../../models/Reservation.model";
import { calcAdvanceAmount } from "../../payments/services/payment.services";

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
    .populate("propertyId", "title location address price currency advanceAmount reservationStatus reservedUntil listingType monthlyRent deposit")
    .sort({ createdAt: -1 });

  return reservations;
}

const DEFAULT_HOLD_HOURS = Number(process.env.COD_RESERVATION_HOURS || 12);
const HOLD_MS =
  Number.isFinite(DEFAULT_HOLD_HOURS) && DEFAULT_HOLD_HOURS > 0
    ? DEFAULT_HOLD_HOURS * 60 * 60 * 1000
    : 12 * 60 * 60 * 1000;

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

  // if an old reservation expired, clear it before proceeding
  if (
    property.reservationStatus === "reserved" &&
    property.reservedUntil &&
    property.reservedUntil.getTime() <= Date.now()
  ) {
    property.reservationStatus = "expired";
    property.reservedBy = null as any;
    property.reservedUntil = null;
    await property.save();
  }

  if (property.reservationStatus === "reserved" || property.reservationStatus === "paid") {
    throw new ApiError(409, "This property is already reserved/booked.");
  }

  const advanceAmount = calcAdvanceAmount(property);
  if (!advanceAmount || advanceAmount <= 0) {
    throw new ApiError(400, "Booking advance is not configured for this property.");
  }

  const bookingAdvancePaisa = Math.round(Number(advanceAmount) * 100);
  const holdExpiresAt = new Date(Date.now() + HOLD_MS);

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

  property.reservationStatus = "reserved";
  property.reservedBy = userId as any;
  property.reservedUntil = holdExpiresAt;
  await property.save();

  return reservation;
}
