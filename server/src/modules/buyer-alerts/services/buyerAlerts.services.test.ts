import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  stateFindOneMock,
  stateCreateMock,
  visitFindMock,
  wishlistFindMock,
  propertyFindMock,
  propertyFindByIdMock,
  stateSaveMock,
} = vi.hoisted(() => ({
  stateFindOneMock: vi.fn(),
  stateCreateMock: vi.fn(),
  visitFindMock: vi.fn(),
  wishlistFindMock: vi.fn(),
  propertyFindMock: vi.fn(),
  propertyFindByIdMock: vi.fn(),
  stateSaveMock: vi.fn(async () => undefined),
}));

vi.mock("../../../models/BuyerAlertState.model", () => ({
  default: {
    findOne: stateFindOneMock,
    create: stateCreateMock,
  },
}));

vi.mock("../../../models/Visit.model", () => ({
  default: {
    find: visitFindMock,
  },
}));

vi.mock("../../../models/Wishlist.model", () => ({
  default: {
    find: wishlistFindMock,
  },
}));

vi.mock("../../../models/Property.model", () => ({
  default: {
    find: propertyFindMock,
    findById: propertyFindByIdMock,
  },
}));

import buyerAlertsService from "./buyerAlerts.services";

describe("buyerAlerts.services (buyer alerts and notifications)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    visitFindMock.mockReturnValue({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({
          populate: vi.fn(() => ({
            lean: vi.fn(async () => []),
          })),
        })),
      })),
    });

    wishlistFindMock.mockReturnValue({
      select: vi.fn(() => ({
        lean: vi.fn(async () => []),
      })),
    });

    propertyFindMock.mockReturnValue({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({
          lean: vi.fn(async () => []),
        })),
      })),
      select: vi.fn(() => ({
        lean: vi.fn(async () => []),
      })),
      lean: vi.fn(async () => []),
    });
  });

  it("creates default state when missing and returns empty feed", async () => {
    stateFindOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userId: "buyer-1",
      preferences: { alertsEnabled: true, visitsEnabled: true, offersEnabled: true },
      rules: [],
      items: [],
      save: stateSaveMock,
    });
    stateCreateMock.mockResolvedValueOnce({
      userId: "buyer-1",
      preferences: { alertsEnabled: true, visitsEnabled: true, offersEnabled: true },
      rules: [],
      items: [],
      save: stateSaveMock,
    });

    const feed = await buyerAlertsService.getFeed("buyer-1");

    expect(stateCreateMock).toHaveBeenCalled();
    expect(feed.preferences.alertsEnabled).toBe(true);
    expect(feed.items).toEqual([]);
  });

  it("updates preferences and persists", async () => {
    const state: any = {
      userId: "buyer-1",
      preferences: { alertsEnabled: true, visitsEnabled: true, offersEnabled: true },
      rules: [],
      items: [],
      save: stateSaveMock,
    };
    stateFindOneMock.mockResolvedValueOnce(state);

    const preferences = await buyerAlertsService.updatePreferences("buyer-1", {
      offersEnabled: false,
    });

    expect(preferences.offersEnabled).toBe(false);
    expect(stateSaveMock).toHaveBeenCalled();
  });

  it("creates and updates a rule", async () => {
    const state: any = {
      userId: "buyer-1",
      preferences: { alertsEnabled: true, visitsEnabled: true, offersEnabled: true },
      rules: [],
      items: [],
      save: stateSaveMock,
    };
    stateFindOneMock.mockResolvedValue(state);

    const created = await buyerAlertsService.createRule("buyer-1", {
      name: "Kathmandu homes",
      query: "home",
      location: "kathmandu",
      maxPrice: 100000,
    });
    expect(created.name).toBe("Kathmandu homes");
    expect(stateSaveMock).toHaveBeenCalled();
    state.rules = [created];

    const updated = await buyerAlertsService.updateRule("buyer-1", created.id, {
      name: "Updated rule",
      minBeds: 3,
    });
    expect(updated?.name).toBe("Updated rule");
    expect(updated?.minBeds).toBe(3);
  });

  it("marks one and all feed items as read", async () => {
    const state: any = {
      userId: "buyer-1",
      preferences: { alertsEnabled: true, visitsEnabled: true, offersEnabled: true },
      rules: [],
      items: [
        { id: "a1", isRead: false, createdAt: new Date() },
        { id: "a2", isRead: false, createdAt: new Date() },
      ],
      save: stateSaveMock,
    };
    stateFindOneMock.mockResolvedValue(state);

    await buyerAlertsService.markItemRead("buyer-1", "a1");
    expect(state.items[0].isRead).toBe(true);

    await buyerAlertsService.markAllRead("buyer-1");
    expect(state.items.every((item: any) => item.isRead)).toBe(true);
  });
});
