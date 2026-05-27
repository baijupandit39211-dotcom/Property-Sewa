import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  propertyFindOneMock,
  propertyFindByIdMock,
  paymentUpdateManyMock,
  paymentCreateMock,
  paymentFindByIdMock,
  paymentSaveMock,
  reservationUpdateManyMock,
  expirePropertyReservationIfNeededMock,
  isReservationActiveMock,
  isReservationPaidMock,
  getReservationBuyerIdMock,
  assignPropertyReservationMock,
} = vi.hoisted(() => ({
  propertyFindOneMock: vi.fn(),
  propertyFindByIdMock: vi.fn(),
  paymentUpdateManyMock: vi.fn(),
  paymentCreateMock: vi.fn(),
  paymentFindByIdMock: vi.fn(),
  paymentSaveMock: vi.fn(async () => undefined),
  reservationUpdateManyMock: vi.fn(async () => undefined),
  expirePropertyReservationIfNeededMock: vi.fn(async () => false),
  isReservationActiveMock: vi.fn(() => false),
  isReservationPaidMock: vi.fn(() => false),
  getReservationBuyerIdMock: vi.fn(() => ""),
  assignPropertyReservationMock: vi.fn(),
}));

vi.mock("../../../models/Property.model", () => ({
  default: {
    findOne: propertyFindOneMock,
    findById: propertyFindByIdMock,
  },
}));

vi.mock("../../../models/Payment.model", () => ({
  default: {
    updateMany: paymentUpdateManyMock,
    create: paymentCreateMock,
    findById: paymentFindByIdMock,
  },
}));

vi.mock("../../../models/Reservation.model", () => ({
  default: {
    updateMany: reservationUpdateManyMock,
  },
}));

vi.mock("../../property/utils/reservation.utils", async () => {
  const actual = await vi.importActual("../../property/utils/reservation.utils");
  return {
    ...actual,
    expirePropertyReservationIfNeeded: expirePropertyReservationIfNeededMock,
    isReservationActive: isReservationActiveMock,
    isReservationPaid: isReservationPaidMock,
    getReservationBuyerId: getReservationBuyerIdMock,
    assignPropertyReservation: assignPropertyReservationMock,
    expireStalePropertyReservations: vi.fn(async () => 0),
    clearPropertyReservation: vi.fn(),
  };
});

import { calcAdvanceAmount, initiatePayment, markPaid } from "./payment.services";

describe("payment.services (reservation and payment management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcAdvanceAmount uses sale fallback 2% when explicit advance is missing", () => {
    expect(calcAdvanceAmount({ listingType: "buy", price: 5000000 })).toBe(100000);
  });

  it("calcAdvanceAmount uses rent deposit first, then monthlyRent fallback", () => {
    expect(calcAdvanceAmount({ listingType: "rent", deposit: 70000, monthlyRent: 30000 })).toBe(70000);
    expect(calcAdvanceAmount({ listingType: "rent", deposit: 0, monthlyRent: 30000 })).toBe(6000);
  });

  it("initiatePayment rejects when property has active reservation by another user", async () => {
    propertyFindOneMock.mockResolvedValueOnce({
      _id: "p1",
      status: "active",
      price: 1000000,
    });
    isReservationActiveMock.mockReturnValueOnce(true);
    getReservationBuyerIdMock.mockReturnValueOnce("other-buyer");

    await expect(
      initiatePayment({ propertyId: "p1", buyerId: "buyer-1", gateway: "khalti" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("markPaid marks expired payment and throws 410", async () => {
    paymentFindByIdMock.mockResolvedValueOnce({
      _id: "pay-1",
      buyerId: "buyer-1",
      status: "pending",
      expiresAt: new Date(Date.now() - 60_000),
      save: paymentSaveMock,
    });

    await expect(
      markPaid({ paymentId: "pay-1", buyerId: "buyer-1" })
    ).rejects.toMatchObject({ statusCode: 410 });

    expect(paymentSaveMock).toHaveBeenCalled();
  });

  it("markPaid succeeds and updates property reservation to paid", async () => {
    const paymentDoc: any = {
      _id: "pay-2",
      buyerId: "buyer-2",
      propertyId: "prop-2",
      gateway: "khalti",
      status: "pending",
      amount: 12000,
      expiresAt: new Date(Date.now() + 600000),
      save: paymentSaveMock,
      khalti_pidx: "",
      khalti_txnId: "",
    };
    const propertyDoc: any = {
      _id: "prop-2",
      reservationStatus: "active",
      reservedAt: new Date(),
      save: vi.fn(async () => undefined),
    };

    paymentFindByIdMock.mockResolvedValueOnce(paymentDoc);
    propertyFindByIdMock.mockResolvedValueOnce(propertyDoc);
    isReservationActiveMock.mockReturnValue(false);
    isReservationPaidMock.mockReturnValue(false);

    const result = await markPaid({
      paymentId: "pay-2",
      buyerId: "buyer-2",
      gatewayRef: { pidx: "pidx-1", transaction_id: "txn-1" },
    });

    expect(result.status).toBe("paid");
    expect(assignPropertyReservationMock).toHaveBeenCalled();
    expect(reservationUpdateManyMock).toHaveBeenCalled();
    expect(propertyDoc.save).toHaveBeenCalled();
  });
});
