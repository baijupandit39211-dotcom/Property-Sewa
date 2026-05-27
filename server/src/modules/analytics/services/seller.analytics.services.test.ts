import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  propertyFindMock,
  propertyCountDocumentsMock,
  leadCountDocumentsMock,
  visitCountDocumentsMock,
  propertyViewCountDocumentsMock,
  propertyViewAggregateMock,
  leadAggregateMock,
  visitAggregateMock,
  leadFindMock,
  visitFindMock,
} = vi.hoisted(() => ({
  propertyFindMock: vi.fn(),
  propertyCountDocumentsMock: vi.fn(),
  leadCountDocumentsMock: vi.fn(),
  visitCountDocumentsMock: vi.fn(),
  propertyViewCountDocumentsMock: vi.fn(),
  propertyViewAggregateMock: vi.fn(),
  leadAggregateMock: vi.fn(),
  visitAggregateMock: vi.fn(),
  leadFindMock: vi.fn(),
  visitFindMock: vi.fn(),
}));

vi.mock("../../../models/Property.model", () => ({
  default: {
    find: propertyFindMock,
    countDocuments: propertyCountDocumentsMock,
    aggregate: vi.fn(async () => []),
  },
}));

vi.mock("../../../models/Lead.model", () => ({
  default: {
    countDocuments: leadCountDocumentsMock,
    aggregate: leadAggregateMock,
    find: leadFindMock,
  },
}));

vi.mock("../../../models/Visit.model", () => ({
  default: {
    countDocuments: visitCountDocumentsMock,
    aggregate: visitAggregateMock,
    find: visitFindMock,
  },
}));

vi.mock("../../../models/PropertyView.model", () => ({
  default: {
    countDocuments: propertyViewCountDocumentsMock,
    aggregate: propertyViewAggregateMock,
  },
}));

import sellerAnalyticsService from "./seller.analytics.services";

function chainWithLean(items: any[]) {
  const doublePopulateResult = {
    lean: vi.fn(async () => items),
  };
  const populateResult: any = {
    lean: vi.fn(async () => items),
    populate: vi.fn(() => doublePopulateResult),
  };
  const sortResult: any = {
    lean: vi.fn(async () => items),
    limit: vi.fn(() => ({
      populate: vi.fn(() => populateResult),
      lean: vi.fn(async () => items),
    })),
  };
  return {
    select: vi.fn(() => ({
      sort: vi.fn(() => sortResult),
    })),
    sort: vi.fn(() => sortResult),
  };
}

describe("seller.analytics.services (reporting, analytics, export)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    propertyFindMock.mockReturnValue(chainWithLean([]));
    leadFindMock.mockReturnValue(chainWithLean([]));
    visitFindMock.mockReturnValue(chainWithLean([]));

    propertyViewCountDocumentsMock.mockResolvedValue(0);
    leadCountDocumentsMock.mockResolvedValue(0);
    visitCountDocumentsMock.mockResolvedValue(0);

    propertyViewAggregateMock.mockResolvedValue([]);
    leadAggregateMock.mockResolvedValue([]);
    visitAggregateMock.mockResolvedValue([]);
  });

  it("returns default 30d window when range is invalid", async () => {
    const result = await sellerAnalyticsService.getSellerAnalytics(
      "507f191e810c19729de860ea",
      "invalid-range"
    );

    expect(result.filters.range).toBe("30d");
    expect(result.filters.days).toBe(30);
    expect(result.summary.totalListings).toBe(0);
  });

  it("computes summary, property performance, and recent activity from model data", async () => {
    propertyFindMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        sort: vi.fn(() => ({
          lean: vi.fn(async () => [
            {
              _id: "p1",
              title: "City Flat",
              location: "Kathmandu",
              status: "active",
              listingType: "buy",
              price: 8000000,
              currency: "NPR",
              images: [{ url: "img-1" }],
              createdAt: new Date(),
            },
          ]),
        })),
      })),
    });

    propertyViewCountDocumentsMock
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(25);
    leadCountDocumentsMock.mockResolvedValueOnce(12).mockResolvedValueOnce(6).mockResolvedValueOnce(3);
    visitCountDocumentsMock
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    propertyViewAggregateMock
      .mockResolvedValueOnce([{ _id: "2026-05-01", count: 10 }])
      .mockResolvedValueOnce([{ _id: "p1", count: 50, lastAt: new Date() }]);
    leadAggregateMock
      .mockResolvedValueOnce([{ _id: "2026-05-01", count: 2 }])
      .mockResolvedValueOnce([{ _id: "p1", count: 6, lastAt: new Date() }])
      .mockResolvedValueOnce([{ _id: "new", count: 6 }]);
    visitAggregateMock
      .mockResolvedValueOnce([{ _id: "2026-05-01", count: 1 }])
      .mockResolvedValueOnce([{ _id: "2026-05-01", count: 1 }])
      .mockResolvedValueOnce([{ _id: "p1", count: 4, lastAt: new Date() }])
      .mockResolvedValueOnce([{ _id: "confirmed", count: 2 }]);

    leadFindMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        sort: vi.fn(() => ({
          limit: vi.fn(() => ({
            populate: vi.fn(() => ({
              lean: vi.fn(async () => [
                {
                  _id: "l1",
                  status: "new",
                  createdAt: new Date(),
                  propertyId: { _id: "p1", title: "City Flat", location: "Kathmandu" },
                  name: "Buyer A",
                  email: "buyer@test.com",
                  message: "Interested",
                },
              ]),
            })),
          })),
        })),
      })),
    });

    visitFindMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        sort: vi.fn(() => ({
          limit: vi.fn(() => ({
            populate: vi.fn(() => ({
              populate: vi.fn(() => ({
                lean: vi.fn(async () => []),
              })),
            })),
          })),
        })),
      })),
    });

    const result = await sellerAnalyticsService.getSellerAnalytics(
      "507f191e810c19729de860ea",
      "30d"
    );

    expect(result.summary.totalListings).toBe(1);
    expect(result.summary.views).toBe(50);
    expect(result.summary.leads).toBe(6);
    expect(result.propertyPerformance.length).toBe(1);
    expect(result.propertyPerformance[0].title).toBe("City Flat");
    expect(result.recentActivity.length).toBeGreaterThan(0);
  });
});
