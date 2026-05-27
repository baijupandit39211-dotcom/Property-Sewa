import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../utils/apiError";

const {
  propertyFindByIdMock,
  visitFindOneMock,
  visitCreateMock,
  visitFindByIdMock,
  leadFindByIdAndUpdateMock,
  messageCreateMock,
  invalidateAdminDashboardCacheMock,
} = vi.hoisted(() => ({
  propertyFindByIdMock: vi.fn(),
  visitFindOneMock: vi.fn(),
  visitCreateMock: vi.fn(),
  visitFindByIdMock: vi.fn(),
  leadFindByIdAndUpdateMock: vi.fn(),
  messageCreateMock: vi.fn(),
  invalidateAdminDashboardCacheMock: vi.fn(async () => undefined),
}));

vi.mock("../../../models/Property.model", () => ({
  default: {
    findById: propertyFindByIdMock,
  },
}));

vi.mock("../../../models/Visit.model", () => ({
  default: {
    findOne: visitFindOneMock,
    create: visitCreateMock,
    findById: visitFindByIdMock,
  },
}));

vi.mock("../../../models/Lead.model", () => ({
  default: {
    findByIdAndUpdate: leadFindByIdAndUpdateMock,
  },
}));

vi.mock("../../../models/Message.model", () => ({
  default: {
    create: messageCreateMock,
  },
}));

vi.mock("../../admin-overview/services/adminOverview.services", () => ({
  invalidateAdminDashboardCache: invalidateAdminDashboardCacheMock,
}));

import visitService from "./visit.services";

describe("visit.services (visit scheduling and appointment management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leadFindByIdAndUpdateMock.mockResolvedValue(null);
    messageCreateMock.mockResolvedValue(null);
  });

  it("createVisit rejects when property does not belong to seller", async () => {
    propertyFindByIdMock.mockReturnValueOnce({
      select: vi.fn(async () => ({ createdBy: "seller-1" })),
    });

    await expect(
      visitService.createVisit({
        propertyId: "p1",
        buyerId: "buyer-1",
        sellerId: "seller-2",
        preferredDate: new Date("2026-05-25"),
        preferredTimeSlot: "10:00 AM - 11:00 AM",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("createVisit rejects duplicate active request for same buyer/property", async () => {
    propertyFindByIdMock.mockReturnValueOnce({
      select: vi.fn(async () => ({ createdBy: "seller-1" })),
    });
    visitFindOneMock.mockReturnValueOnce({
      lean: vi.fn(async () => ({ _id: "existing-active" })),
    });

    await expect(
      visitService.createVisit({
        propertyId: "p1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        preferredDate: new Date("2026-05-25"),
        preferredTimeSlot: "10:00 AM - 11:00 AM",
      })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("createVisit creates requested visit and updates lead status", async () => {
    propertyFindByIdMock.mockReturnValueOnce({
      select: vi.fn(async () => ({ createdBy: "seller-1" })),
    });
    visitFindOneMock
      .mockReturnValueOnce({ lean: vi.fn(async () => null) })
      .mockReturnValueOnce({ lean: vi.fn(async () => null) });

    const visitDoc = {
      _id: "v1",
      status: "requested",
      populate: vi.fn(async () => undefined),
    };
    visitCreateMock.mockResolvedValueOnce(visitDoc);

    const visit = await visitService.createVisit({
      propertyId: "p1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      leadId: "l1",
      preferredDate: new Date("2026-05-25"),
      preferredTimeSlot: "10:00 AM - 11:00 AM",
      buyerMessage: "Please confirm.",
    });

    expect(visit).toBe(visitDoc);
    expect(visitCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "requested",
        leadId: "l1",
        preferredTimeSlot: "10:00 AM - 11:00 AM",
      })
    );
    expect(leadFindByIdAndUpdateMock).toHaveBeenCalledWith("l1", { status: "visit_scheduled" });
    expect(invalidateAdminDashboardCacheMock).toHaveBeenCalled();
  });

  it("sellerUpdateVisit sets completed status and appends lead auto message", async () => {
    const visitDoc: any = {
      _id: "v2",
      sellerId: "seller-1",
      buyerId: "buyer-1",
      leadId: "l2",
      preferredDate: new Date("2026-05-26"),
      preferredTimeSlot: "2 PM",
      requestedDate: new Date("2026-05-26"),
      preferredTime: "2 PM",
      status: "requested",
      save: vi.fn(async () => undefined),
    };

    visitFindByIdMock.mockResolvedValueOnce(visitDoc);
    visitFindByIdMock.mockReturnValueOnce({
      populate: vi.fn(async () => ({
        ...visitDoc,
        buyerId: { _id: "buyer-1" },
        sellerId: { _id: "seller-1" },
        leadId: { _id: "l2" },
      })),
    });

    const result = await visitService.sellerUpdateVisit("v2", "seller-1", {
      status: "completed",
      sellerNote: "Visit done successfully",
    });

    expect(result).toBeTruthy();
    expect(visitDoc.status).toBe("completed");
    expect(leadFindByIdAndUpdateMock).toHaveBeenCalledWith("l2", { status: "closed" });
    expect(messageCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "l2",
        senderRole: "seller",
        isAutoReply: true,
      })
    );
  });
});
