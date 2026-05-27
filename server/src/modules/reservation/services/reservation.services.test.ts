import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindByIdMock,
  propertyFindOneMock,
  reservationCreateMock,
  expirePropertyReservationIfNeededMock,
  isReservationActiveMock,
  isReservationPaidMock,
  getReservationBuyerIdMock,
  assignPropertyReservationMock,
  calcAdvanceAmountMock,
} = vi.hoisted(() => ({
  userFindByIdMock: vi.fn(),
  propertyFindOneMock: vi.fn(),
  reservationCreateMock: vi.fn(),
  expirePropertyReservationIfNeededMock: vi.fn(async () => false),
  isReservationActiveMock: vi.fn(() => false),
  isReservationPaidMock: vi.fn(() => false),
  getReservationBuyerIdMock: vi.fn(() => ""),
  assignPropertyReservationMock: vi.fn(),
  calcAdvanceAmountMock: vi.fn(() => 10000),
}));

vi.mock("../../../models/User.model", () => ({
  default: {
    findById: userFindByIdMock,
  },
}));

vi.mock("../../../models/Property.model", () => ({
  default: {
    findOne: propertyFindOneMock,
  },
}));

vi.mock("../../../models/Reservation.model", () => ({
  default: {
    create: reservationCreateMock,
    find: vi.fn(() => ({ populate: vi.fn(() => ({ sort: vi.fn(async () => []) })) })),
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
  };
});

vi.mock("../../payments/services/payment.services", () => ({
  calcAdvanceAmount: calcAdvanceAmountMock,
}));

import { createCodReservation } from "./reservation.services";

describe("reservation.services (reservation and payment management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when required contact fields are missing", async () => {
    await expect(
      createCodReservation({
        propertyId: "p1",
        userId: "u1",
        fullName: "",
        phone: "",
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects when property is already reserved by another user", async () => {
    userFindByIdMock.mockResolvedValueOnce({ _id: "u1" });
    propertyFindOneMock.mockResolvedValueOnce({ _id: "p1", status: "active" });
    isReservationActiveMock.mockReturnValueOnce(true);
    getReservationBuyerIdMock.mockReturnValueOnce("other-user");

    await expect(
      createCodReservation({
        propertyId: "p1",
        userId: "u1",
        fullName: "Test User",
        phone: "9800000000",
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("creates COD reservation and assigns active property reservation", async () => {
    const propertyDoc: any = {
      _id: "p2",
      status: "active",
      save: vi.fn(async () => undefined),
    };

    userFindByIdMock.mockResolvedValueOnce({ _id: "buyer-1" });
    propertyFindOneMock.mockResolvedValueOnce(propertyDoc);
    reservationCreateMock.mockResolvedValueOnce({ _id: "r1", reservationStatus: "REQUESTED" });
    calcAdvanceAmountMock.mockReturnValueOnce(15000);

    const reservation = await createCodReservation({
      propertyId: "p2",
      userId: "buyer-1",
      fullName: "Buyer One",
      phone: "9811111111",
      message: "Please call me",
    });

    expect(reservation._id).toBe("r1");
    expect(assignPropertyReservationMock).toHaveBeenCalled();
    expect(propertyDoc.save).toHaveBeenCalled();
  });
});
