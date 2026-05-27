import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../utils/apiError";

const {
  wishlistFindOneAndUpdateMock,
  wishlistFindOneMock,
  wishlistFindOneAndDeleteMock,
  wishlistFindMock,
  wishlistExistsMock,
  propertyFindByIdMock,
  isPropertyVisibleToViewerMock,
  expireStalePropertyReservationsMock,
} = vi.hoisted(() => ({
  wishlistFindOneAndUpdateMock: vi.fn(),
  wishlistFindOneMock: vi.fn(),
  wishlistFindOneAndDeleteMock: vi.fn(),
  wishlistFindMock: vi.fn(),
  wishlistExistsMock: vi.fn(),
  propertyFindByIdMock: vi.fn(),
  isPropertyVisibleToViewerMock: vi.fn(),
  expireStalePropertyReservationsMock: vi.fn(async () => 0),
}));

vi.mock("../../../models/Wishlist.model", () => ({
  default: {
    findOneAndUpdate: wishlistFindOneAndUpdateMock,
    findOne: wishlistFindOneMock,
    findOneAndDelete: wishlistFindOneAndDeleteMock,
    find: wishlistFindMock,
    exists: wishlistExistsMock,
  },
}));

vi.mock("../../../models/Property.model", () => ({
  default: {
    findById: propertyFindByIdMock,
  },
}));

vi.mock("../../property/services/property.services", () => ({
  isPropertyVisibleToViewer: isPropertyVisibleToViewerMock,
}));

vi.mock("../../property/utils/reservation.utils", () => ({
  expireStalePropertyReservations: expireStalePropertyReservationsMock,
}));

import wishlistService from "./wishlist.services";

describe("wishlist.services (wishlist and saved properties)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addToWishlist throws 404 when property is not visible", async () => {
    propertyFindByIdMock.mockResolvedValueOnce({ _id: "p1" });
    isPropertyVisibleToViewerMock.mockReturnValueOnce(false);

    await expect(wishlistService.addToWishlist("buyer-1", "p1")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("addToWishlist upserts and returns populated wishlist item", async () => {
    propertyFindByIdMock.mockResolvedValueOnce({ _id: "p1" });
    isPropertyVisibleToViewerMock.mockReturnValueOnce(true).mockReturnValueOnce(true);

    wishlistFindOneAndUpdateMock.mockResolvedValueOnce({});
    wishlistFindOneMock.mockReturnValueOnce({
      populate: vi.fn(async () => ({
        _id: "w1",
        buyerId: "buyer-1",
        propertyId: { _id: "p1", title: "Home" },
      })),
    });

    const item = await wishlistService.addToWishlist("buyer-1", "p1");

    expect(item).toBeTruthy();
    expect(wishlistFindOneAndUpdateMock).toHaveBeenCalledWith(
      { buyerId: "buyer-1", propertyId: "p1" },
      { $setOnInsert: { buyerId: "buyer-1", propertyId: "p1" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });

  it("removeFromWishlist returns success=false when nothing deleted", async () => {
    wishlistFindOneAndDeleteMock.mockResolvedValueOnce(null);
    const result = await wishlistService.removeFromWishlist("buyer-1", "p1");
    expect(result).toEqual({ success: false });
  });

  it("getWishlist filters invisible properties and applies pagination", async () => {
    wishlistFindMock.mockReturnValueOnce({
      populate: vi.fn(() => ({
        sort: vi.fn(async () => [
          { _id: "w1", propertyId: { _id: "p1" } },
          { _id: "w2", propertyId: { _id: "p2" } },
          { _id: "w3", propertyId: { _id: "p3" } },
        ]),
      })),
    });
    isPropertyVisibleToViewerMock
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const result = await wishlistService.getWishlist("buyer-1", { page: 1, limit: 1 });

    expect(result.total).toBe(2);
    expect(result.items.length).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it("isInWishlist returns false when property is hidden", async () => {
    propertyFindByIdMock.mockResolvedValueOnce({ _id: "p1" });
    isPropertyVisibleToViewerMock.mockReturnValueOnce(false);

    const saved = await wishlistService.isInWishlist("buyer-1", "p1");
    expect(saved).toBe(false);
    expect(wishlistExistsMock).not.toHaveBeenCalled();
  });
});
