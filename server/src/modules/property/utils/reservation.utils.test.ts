import { describe, expect, it, vi } from "vitest";
import {
  assignPropertyReservation,
  clearPropertyReservation,
  getReservationStatus,
  isReservationActive,
  isReservationExpired,
  isReservationVisibleToBuyer,
  PROPERTY_RESERVATION_WINDOW_MS,
  expirePropertyReservationIfNeeded,
} from "./reservation.utils";

describe("reservation.utils", () => {
  it("normalizes reservation status values", () => {
    expect(getReservationStatus({ reservationStatus: "reserved" })).toBe("active");
    expect(getReservationStatus({ reservationStatus: "paid" })).toBe("paid");
    expect(getReservationStatus({ reservationStatus: "none" })).toBe("expired");
    expect(getReservationStatus({ reservationStatus: "unknown" })).toBeNull();
  });

  it("detects active vs expired reservations by time", () => {
    const now = new Date("2026-05-25T10:00:00.000Z");

    expect(
      isReservationActive(
        { reservationStatus: "active", reservationExpiresAt: "2026-05-25T10:05:00.000Z" },
        now
      )
    ).toBe(true);

    expect(
      isReservationExpired(
        { reservationStatus: "active", reservationExpiresAt: "2026-05-25T09:55:00.000Z" },
        now
      )
    ).toBe(true);
  });

  it("only shows active/paid reservation to the buyer who reserved it", () => {
    const property = {
      reservationStatus: "active",
      reservationExpiresAt: "2026-05-25T11:00:00.000Z",
      reservedBy: "buyer-1",
    };

    expect(isReservationVisibleToBuyer(property, "buyer-1", new Date("2026-05-25T10:00:00.000Z"))).toBe(
      true
    );
    expect(isReservationVisibleToBuyer(property, "buyer-2", new Date("2026-05-25T10:00:00.000Z"))).toBe(
      false
    );
  });

  it("assigns reservation defaults with one-hour active window", () => {
    const reservedAt = new Date("2026-05-25T10:00:00.000Z");
    const property: Record<string, unknown> = {};

    assignPropertyReservation(property, {
      buyerId: "buyer-11",
      type: "COD",
      reservedAt,
    });

    expect(property.reservationType).toBe("COD");
    expect(property.reservationStatus).toBe("active");
    expect(property.reservedBy).toBe("buyer-11");
    expect(property.reservedUntil).toBeInstanceOf(Date);
    expect((property.reservedUntil as Date).getTime()).toBe(
      reservedAt.getTime() + PROPERTY_RESERVATION_WINDOW_MS
    );
  });

  it("clears reservation state as expired", () => {
    const property: Record<string, unknown> = {
      reservationType: "COD",
      reservationStatus: "active",
      reservedBy: "buyer-2",
      reservedAt: new Date(),
      reservationExpiresAt: new Date(),
      reservedUntil: new Date(),
    };

    clearPropertyReservation(property);

    expect(property.reservationType).toBeNull();
    expect(property.reservationStatus).toBe("expired");
    expect(property.reservedBy).toBeNull();
    expect(property.reservedAt).toBeNull();
    expect(property.reservationExpiresAt).toBeNull();
    expect(property.reservedUntil).toBeNull();
  });

  it("expires stale reservation and persists through save()", async () => {
    const save = vi.fn(async () => undefined);
    const property: Record<string, unknown> & { save: () => Promise<void> } = {
      reservationStatus: "active",
      reservationExpiresAt: "2026-05-25T09:50:00.000Z",
      reservedBy: "buyer-9",
      reservationType: "ADVANCE",
      save,
    };

    const changed = await expirePropertyReservationIfNeeded(
      property,
      new Date("2026-05-25T10:00:00.000Z")
    );

    expect(changed).toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(property.reservationStatus).toBe("expired");
    expect(property.reservedBy).toBeNull();
  });
});
