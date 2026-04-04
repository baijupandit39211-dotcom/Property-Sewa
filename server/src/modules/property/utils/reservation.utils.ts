import Property from "../../../models/Property.model";

export const PROPERTY_RESERVATION_WINDOW_MS = 60 * 60 * 1000;

export type PropertyReservationType = "COD" | "ADVANCE";
export type PropertyReservationStatus = "active" | "paid" | "expired";

function asDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getReservationStatus(property: any): PropertyReservationStatus | null {
  const raw = String(property?.reservationStatus || "").trim().toLowerCase();
  if (!raw || raw === "none" || raw === "cancelled" || raw === "expired") return "expired";
  if (raw === "active" || raw === "reserved") return "active";
  if (raw === "paid") return "paid";
  return null;
}

export function getReservationType(property: any): PropertyReservationType | null {
  const raw = String(property?.reservationType || "").trim().toUpperCase();
  if (raw === "COD" || raw === "ADVANCE") return raw;
  return null;
}

export function getReservationExpiresAt(property: any) {
  return asDate(property?.reservationExpiresAt || property?.reservedUntil);
}

export function getReservationReservedAt(property: any) {
  return asDate(property?.reservedAt);
}

export function getReservationBuyerId(property: any) {
  return property?.reservedBy ? String(property.reservedBy) : "";
}

export function isReservationActive(property: any, now = new Date()) {
  const status = getReservationStatus(property);
  if (status !== "active") return false;

  const expiresAt = getReservationExpiresAt(property);
  if (!expiresAt) return false;

  return expiresAt.getTime() > now.getTime();
}

export function isReservationExpired(property: any, now = new Date()) {
  const status = getReservationStatus(property);
  if (status !== "active") return false;

  const expiresAt = getReservationExpiresAt(property);
  if (!expiresAt) return true;

  return expiresAt.getTime() <= now.getTime();
}

export function isReservationPaid(property: any) {
  return getReservationStatus(property) === "paid";
}

export function isReservationVisibleToBuyer(property: any, buyerId?: string, now = new Date()) {
  if (isReservationPaid(property)) {
    return !!buyerId && getReservationBuyerId(property) === String(buyerId);
  }

  if (isReservationActive(property, now)) {
    return !!buyerId && getReservationBuyerId(property) === String(buyerId);
  }

  return true;
}

export function clearPropertyReservation(property: any, status: PropertyReservationStatus = "expired") {
  property.reservationType = null;
  property.reservationStatus = status;
  property.reservedBy = null;
  property.reservedAt = null;
  property.reservationExpiresAt = null;
  property.reservedUntil = null;
}

export function assignPropertyReservation(
  property: any,
  input: {
    buyerId: string;
    type: PropertyReservationType;
    reservedAt?: Date;
    expiresAt?: Date;
    status?: Extract<PropertyReservationStatus, "active" | "paid">;
  }
) {
  const reservedAt = input.reservedAt || new Date();
  const expiresAt =
    input.expiresAt ||
    (input.status === "paid"
      ? null
      : new Date(reservedAt.getTime() + PROPERTY_RESERVATION_WINDOW_MS));

  property.reservationType = input.type;
  property.reservationStatus = input.status || "active";
  property.reservedBy = input.buyerId as any;
  property.reservedAt = reservedAt;
  property.reservationExpiresAt = expiresAt;
  property.reservedUntil = expiresAt;
}

export async function expirePropertyReservationIfNeeded(property: any, now = new Date()) {
  if (!property) return false;
  if (!isReservationExpired(property, now)) return false;

  clearPropertyReservation(property, "expired");
  await property.save();
  return true;
}

export async function expireStalePropertyReservations(now = new Date()) {
  const result = await Property.updateMany(
    {
      $or: [
        { reservationStatus: "active", reservationExpiresAt: { $lte: now } },
        { reservationStatus: "reserved", reservedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        reservationStatus: "expired",
        reservationType: null,
        reservedBy: null,
        reservedAt: null,
        reservationExpiresAt: null,
        reservedUntil: null,
      },
    }
  );

  return result.modifiedCount || 0;
}
