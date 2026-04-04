export type ClientReservationStatus = "available" | "active" | "paid";
export type ClientReservationType = "COD" | "ADVANCE" | null;

function toDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getReservationType(property: any): ClientReservationType {
  const raw = String(property?.reservationType || "").trim().toUpperCase();
  if (raw === "COD" || raw === "ADVANCE") return raw;
  return null;
}

export function getReservationExpiresAt(property: any) {
  return toDate(property?.reservationExpiresAt || property?.reservedUntil);
}

export function getReservationStatus(property: any): ClientReservationStatus {
  const raw = String(property?.reservationStatus || "").trim().toLowerCase();
  const expiresAt = getReservationExpiresAt(property);
  const isActive = !!expiresAt && expiresAt.getTime() > Date.now();

  if (raw === "paid") return "paid";
  if ((raw === "active" || raw === "reserved") && isActive) return "active";
  return "available";
}

export function getReservationOwnerId(property: any) {
  return property?.reservedBy ? String(property.reservedBy) : "";
}
