import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  propertyFindByIdMock,
  reportFindOneMock,
  reportCreateMock,
  reportFindByIdMock,
  reportUpdateManyMock,
  rejectPropertyMock,
} = vi.hoisted(() => ({
  propertyFindByIdMock: vi.fn(),
  reportFindOneMock: vi.fn(),
  reportCreateMock: vi.fn(),
  reportFindByIdMock: vi.fn(),
  reportUpdateManyMock: vi.fn(async () => undefined),
  rejectPropertyMock: vi.fn(async () => ({ _id: "p1", status: "rejected" })),
}));

vi.mock("../../models/Property.model", () => ({
  default: {
    findById: propertyFindByIdMock,
  },
}));

vi.mock("./report.model", () => ({
  default: {
    findOne: reportFindOneMock,
    create: reportCreateMock,
    findById: reportFindByIdMock,
    updateMany: reportUpdateManyMock,
    countDocuments: vi.fn(async () => 0),
    aggregate: vi.fn(async () => []),
    find: vi.fn(),
  },
}));

vi.mock("../property/services/property.services", () => ({
  default: {
    rejectProperty: rejectPropertyMock,
    restoreProperty: vi.fn(async () => ({ _id: "p1", status: "active" })),
  },
}));

import reportService from "./report.service";

describe("report.service (reports management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createReport rejects duplicate report for same property/reporter", async () => {
    propertyFindByIdMock.mockReturnValueOnce({
      select: vi.fn(async () => ({ _id: "p1", createdBy: "seller-1" })),
    });
    reportFindOneMock.mockResolvedValueOnce({ _id: "existing" });

    await expect(
      reportService.createReport({
        propertyId: "507f1f77bcf86cd799439011",
        reporterId: "507f191e810c19729de860ea",
        reason: "spam",
        message: "duplicate",
      } as any)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("updateReport rejects when nothing changed", async () => {
    reportFindByIdMock.mockResolvedValueOnce({
      _id: "r1",
      status: "pending",
      action: "none",
      adminNote: "",
      save: vi.fn(async () => undefined),
    });

    await expect(
      reportService.updateReport("507f1f77bcf86cd799439012", {
        status: "pending",
        adminNote: "",
      } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("removePropertyFromReport updates all linked reports to action_taken", async () => {
    reportFindByIdMock
      .mockResolvedValueOnce({
        _id: "r2",
        propertyId: "p1",
        adId: "p1",
      })
      .mockReturnValueOnce({
        populate: vi.fn(() => ({
          populate: vi.fn(() => ({
            populate: vi.fn(() => ({
              populate: vi.fn(async () => ({ _id: "r2", status: "action_taken" })),
            })),
          })),
        })),
      });

    const result = await reportService.removePropertyFromReport(
      "507f1f77bcf86cd799439013",
      "507f191e810c19729de860ea",
      { adminNote: "Removed due to violation" }
    );

    expect(result.property.status).toBe("rejected");
    expect(reportUpdateManyMock).toHaveBeenCalled();
  });
});
