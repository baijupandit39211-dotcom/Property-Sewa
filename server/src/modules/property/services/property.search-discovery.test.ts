import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findMock,
  countDocumentsMock,
  sortMock,
  limitMock,
  skipMock,
  populateMock,
  leanMock,
  getJsonCacheMock,
  setJsonCacheMock,
} = vi.hoisted(() => {
  const lean = vi.fn();
  const limit = vi.fn(() => ({ lean }));
  const sort = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ sort, limit, lean }));

  const skip = vi.fn(() => ({ limit }));
  const populate = vi.fn(() => ({ sort, skip, limit, lean }));
  const find = vi.fn(() => ({ populate, sort, limit, skip, lean, select }));
  const countDocuments = vi.fn();

  return {
    findMock: find,
    countDocumentsMock: countDocuments,
    sortMock: sort,
    limitMock: limit,
    skipMock: skip,
    populateMock: populate,
    selectMock: select,
    leanMock: lean,
    getJsonCacheMock: vi.fn(),
    setJsonCacheMock: vi.fn(async () => undefined),
  };
});

vi.mock("../../../models/Property.model", () => ({
  default: {
    find: findMock,
    countDocuments: countDocumentsMock,
  },
}));

vi.mock("../../../utils/cache", () => ({
  deleteByPattern: vi.fn(async () => undefined),
  getJsonCache: getJsonCacheMock,
  makeCacheKey: vi.fn(() => "cache-key"),
  setJsonCache: setJsonCacheMock,
}));

vi.mock("../../admin-overview/services/adminOverview.services", () => ({
  invalidateAdminDashboardCache: vi.fn(async () => undefined),
}));

vi.mock("../../../utils/metrics", () => ({
  recordPropertyCacheResult: vi.fn(),
  recordAdminPendingPropertiesCacheResult: vi.fn(),
}));

vi.mock("../../../config/redis", () => ({
  getRedisClient: vi.fn(() => null),
  isRedisReady: vi.fn(() => false),
}));

vi.mock("../../../utils/devTiming", () => ({
  logDevTiming: vi.fn(),
  nowMs: vi.fn(() => 0),
}));

vi.mock("../utils/reservation.utils", async () => {
  const actual = await vi.importActual("../utils/reservation.utils");
  return {
    ...actual,
    expireStalePropertyReservations: vi.fn(async () => 0),
  };
});

import propertyService from "./property.services";

describe("property search and discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJsonCacheMock.mockResolvedValue(null);
  });

  it("listSuggestions returns deduplicated title/location/address suggestions", async () => {
    leanMock.mockResolvedValueOnce([
      { title: "Lake View Home", location: "Pokhara", address: "Lakeside" },
      { title: "Lake View Home", location: "Pokhara", address: "Street 2" },
      { title: "City Apartment", location: "Kathmandu", address: "Putalisadak" },
    ]);

    const items = await propertyService.listSuggestions("lake", 8);

    expect(items).toEqual([
      { label: "Lake View Home", type: "title" },
      { label: "Lakeside", type: "address" },
    ]);
    expect(findMock).toHaveBeenCalledOnce();
    expect(sortMock).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(24);
    expect(setJsonCacheMock).toHaveBeenCalled();
  });

  it("listSuggestions respects max limit of 10", async () => {
    leanMock.mockResolvedValueOnce([
      { title: "Home 1", location: "Lalitpur", address: "A1" },
      { title: "Home 2", location: "Lalitpur", address: "A2" },
      { title: "Home 3", location: "Lalitpur", address: "A3" },
      { title: "Home 4", location: "Lalitpur", address: "A4" },
    ]);

    const items = await propertyService.listSuggestions("home", 99);
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it("listApproved enforces paging bounds and returns expected page/limit", async () => {
    populateMock.mockReturnValueOnce({
      sort: vi.fn(() => ({
        skip: vi.fn(() => ({
          limit: vi.fn(async () => [{ _id: "p1", title: "Test Property" }]),
        })),
      })),
    } as any);
    countDocumentsMock.mockResolvedValueOnce(1);

    const result = await propertyService.listApproved({ page: -5, limit: 500, search: "test" });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(24);
    expect(result.total).toBe(1);
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("listApproved searches by location keyword and returns only approved/visible properties", async () => {
    const approvedItems = [
      { _id: "p1", title: "City Flat", location: "Kathmandu", status: "active", approvedBy: "admin-1" },
      { _id: "p2", title: "Lake House", location: "Pokhara", status: "active", approvedBy: "admin-2" },
    ];

    populateMock.mockReturnValueOnce({
      sort: vi.fn(() => ({
        skip: vi.fn(() => ({
          limit: vi.fn(async () => approvedItems),
        })),
      })),
    } as any);
    countDocumentsMock.mockResolvedValueOnce(2);

    const result = await propertyService.listApproved({ search: "Kathmandu", page: 1, limit: 12 });

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        approvedBy: { $ne: null },
      })
    );
    expect(result.items).toEqual(approvedItems);
    expect(result.items.every((item: any) => item.status === "active" && Boolean(item.approvedBy))).toBe(true);
    expect(result.items.some((item: any) => item.location === "Kathmandu")).toBe(true);
  });

  it("listApproved applies price range with property-type keyword search for approved properties only", async () => {
    const filteredItems = [
      {
        _id: "p3",
        title: "Budget Apartment",
        propertyType: "apartment",
        price: 7000000,
        status: "active",
        approvedBy: "admin-1",
      },
    ];

    populateMock.mockReturnValueOnce({
      sort: vi.fn(() => ({
        skip: vi.fn(() => ({
          limit: vi.fn(async () => filteredItems),
        })),
      })),
    } as any);
    countDocumentsMock.mockResolvedValueOnce(1);

    const result = await propertyService.listApproved({
      search: "apartment",
      minPrice: 5000000,
      maxPrice: 8000000,
      page: 1,
      limit: 12,
    });

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        approvedBy: { $ne: null },
        price: { $gte: 5000000, $lte: 8000000 },
      })
    );
    const findArg = findMock.mock.calls[0]?.[0];
    expect(JSON.stringify(findArg)).toContain("propertyType");
    expect(JSON.stringify(findArg)).toContain("apartment");
    expect(result.items).toEqual(filteredItems);
    expect(
      result.items.every(
        (item: any) =>
          item.propertyType === "apartment" &&
          item.price >= 5000000 &&
          item.price <= 8000000 &&
          item.status === "active" &&
          Boolean(item.approvedBy)
      )
    ).toBe(true);
  });
});
