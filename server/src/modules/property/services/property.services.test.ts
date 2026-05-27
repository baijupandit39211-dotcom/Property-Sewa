import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../utils/apiError";

const {
  createMock,
  findMock,
  countDocumentsMock,
  findByIdMock,
  deleteByPatternMock,
  invalidateAdminDashboardCacheMock,
} = vi.hoisted(() => {
  return {
    createMock: vi.fn(),
    findMock: vi.fn(),
    countDocumentsMock: vi.fn(),
    findByIdMock: vi.fn(),
    deleteByPatternMock: vi.fn(async () => undefined),
    invalidateAdminDashboardCacheMock: vi.fn(async () => undefined),
  };
});

vi.mock("../../../models/Property.model", () => ({
  default: {
    create: createMock,
    find: findMock,
    countDocuments: countDocumentsMock,
    findById: findByIdMock,
  },
}));

vi.mock("../../../utils/cache", () => ({
  deleteByPattern: deleteByPatternMock,
  getJsonCache: vi.fn(async () => null),
  makeCacheKey: vi.fn(() => "cache-key"),
  setJsonCache: vi.fn(async () => undefined),
}));

vi.mock("../../admin-overview/services/adminOverview.services", () => ({
  invalidateAdminDashboardCache: invalidateAdminDashboardCacheMock,
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

import propertyService, { isPropertyVisibleToViewer } from "./property.services";

describe("property.services (listing and management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProperty throws when title/location/images are missing", async () => {
    await expect(
      propertyService.createProperty({
        title: "",
        location: "",
        price: 100,
        createdBy: "u1",
        images: [],
      } as any)
    ).rejects.toBeInstanceOf(ApiError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("createProperty rejects when required price is missing and does not create property", async () => {
    await expect(
      propertyService.createProperty({
        title: "No Price Listing",
        description: "Attempt without valid required price",
        location: "Kathmandu",
        listingType: "buy",
        price: 0,
        propertyType: "apartment",
        amenities: ["parking"],
        createdBy: "seller-77",
        images: [{ url: "img-x", publicId: "pub-x" }],
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "price must be > 0 for sale listings",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("createProperty validates rental monthlyRent", async () => {
    await expect(
      propertyService.createProperty({
        title: "Flat",
        location: "Kathmandu",
        listingType: "rent",
        price: 0,
        monthlyRent: 0,
        createdBy: "u1",
        images: [{ url: "x", publicId: "p1" }],
      } as any)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("createProperty saves valid details as pending and binds correct seller", async () => {
    const payload = {
      title: "Modern Family Home",
      description: "Spacious and bright home close to schools and shops",
      location: "Pokhara",
      propertyType: "house",
      listingType: "buy",
      price: 100000,
      amenities: ["parking", "garden", "wifi"],
      createdBy: "seller-42",
      images: [{ url: "img", publicId: "pub" }],
    };

    createMock.mockResolvedValueOnce({
      _id: "p1",
      ...payload,
      status: "pending",
    });

    const created = await propertyService.createProperty(payload as any);

    expect(created).toMatchObject({
      _id: "p1",
      title: payload.title,
      price: payload.price,
      location: payload.location,
      description: payload.description,
      propertyType: payload.propertyType,
      amenities: payload.amenities,
      images: payload.images,
      createdBy: payload.createdBy,
      status: "pending",
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: payload.title,
        price: payload.price,
        location: payload.location,
        description: payload.description,
        propertyType: payload.propertyType,
        amenities: payload.amenities,
        images: payload.images,
        createdBy: payload.createdBy,
        status: "pending",
      })
    );
    expect(deleteByPatternMock).toHaveBeenCalled();
    expect(invalidateAdminDashboardCacheMock).toHaveBeenCalled();
  });

  it("listSuggestions returns [] when query length is less than 2", async () => {
    const result = await propertyService.listSuggestions("a", 8);
    expect(result).toEqual([]);
    expect(findMock).not.toHaveBeenCalled();
  });

  it("isPropertyVisibleToViewer blocks active reservation for other buyers", () => {
    const property = {
      status: "active",
      approvedBy: "admin-1",
      reservationStatus: "active",
      reservationExpiresAt: "2026-05-25T12:00:00.000Z",
      reservedBy: "buyer-1",
    };
    const now = new Date("2026-05-25T10:00:00.000Z");

    expect(isPropertyVisibleToViewer(property, { userId: "buyer-2", role: "buyer" }, now)).toBe(false);
    expect(isPropertyVisibleToViewer(property, { userId: "buyer-1", role: "buyer" }, now)).toBe(true);
  });

  it("adminUpdateStatus rejects invalid status values", async () => {
    findByIdMock.mockResolvedValueOnce({ status: "pending", save: vi.fn() });
    await expect(propertyService.adminUpdateStatus("p1", "invalid-status", "admin-1")).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
