import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getJsonCacheMock,
  setJsonCacheMock,
  auditFindMock,
  userFindMock,
  propertyFindMock,
  reportFindMock,
  paymentFindMock,
  reservationFindMock,
} = vi.hoisted(() => ({
  getJsonCacheMock: vi.fn(),
  setJsonCacheMock: vi.fn(async () => undefined),
  auditFindMock: vi.fn(),
  userFindMock: vi.fn(),
  propertyFindMock: vi.fn(),
  reportFindMock: vi.fn(),
  paymentFindMock: vi.fn(),
  reservationFindMock: vi.fn(),
}));

vi.mock("../../../utils/cache", () => ({
  deleteByPattern: vi.fn(async () => undefined),
  getJsonCache: getJsonCacheMock,
  makeCacheKey: vi.fn(() => "cache-key"),
  setJsonCache: setJsonCacheMock,
}));

vi.mock("../../../utils/devTiming", () => ({
  logDevTiming: vi.fn(),
  nowMs: vi.fn(() => 0),
}));

vi.mock("../../../utils/metrics", () => ({
  recordAdminDashboardCacheResult: vi.fn(),
}));

vi.mock("../../../models/AuditLog.model", () => ({
  default: {
    find: auditFindMock,
  },
}));
vi.mock("../../../models/User.model", () => ({
  default: {
    find: userFindMock,
    countDocuments: vi.fn(async () => 0),
    aggregate: vi.fn(async () => []),
  },
}));
vi.mock("../../../models/Property.model", () => ({
  default: {
    find: propertyFindMock,
    countDocuments: vi.fn(async () => 0),
    aggregate: vi.fn(async () => []),
  },
}));
vi.mock("../../reports/report.model", () => ({
  default: {
    find: reportFindMock,
    countDocuments: vi.fn(async () => 0),
    aggregate: vi.fn(async () => []),
  },
}));
vi.mock("../../../models/Payment.model", () => ({
  default: {
    find: paymentFindMock,
    countDocuments: vi.fn(async () => 0),
    aggregate: vi.fn(async () => []),
  },
}));
vi.mock("../../../models/Reservation.model", () => ({
  default: {
    find: reservationFindMock,
    countDocuments: vi.fn(async () => 0),
  },
}));
vi.mock("../../../models/PropertyView.model", () => ({
  default: {
    countDocuments: vi.fn(async () => 0),
  },
}));

import { getAdminActivity } from "./adminOverview.services";

function leanChain(items: any[]) {
  const chain: any = {};
  chain.populate = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.sort = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.lean = vi.fn(async () => items);
  return chain;
}

describe("adminOverview.services (activity feed and audit logs)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached admin activity when cache hit exists", async () => {
    getJsonCacheMock.mockResolvedValueOnce({ items: [{ id: "cached" }], total: 1 });
    const result = await getAdminActivity({});
    expect(result.items[0].id).toBe("cached");
  });

  it("builds filtered activity feed from audit/user/property sources", async () => {
    getJsonCacheMock.mockResolvedValueOnce(null);

    auditFindMock.mockReturnValueOnce(
      leanChain([
        {
          _id: "a1",
          action: "user.status.updated",
          metadata: { before: "active", after: "suspended" },
          actorId: { name: "Admin One", role: "admin" },
          targetUserId: { _id: "u1", name: "User One" },
          createdAt: new Date(),
        },
      ])
    );
    userFindMock.mockReturnValueOnce(
      leanChain([{ _id: "u1", name: "User One", email: "u1@test.com", role: "buyer", status: "active", createdAt: new Date() }])
    );
    propertyFindMock.mockReturnValueOnce(
      leanChain([{ _id: "p1", title: "Flat", location: "Kathmandu", status: "pending", createdBy: { name: "Seller One", role: "seller" }, createdAt: new Date() }])
    );
    reportFindMock.mockReturnValueOnce(leanChain([]));
    paymentFindMock.mockReturnValueOnce(leanChain([]));
    reservationFindMock.mockReturnValueOnce(leanChain([]));

    const result = await getAdminActivity({ source: "audit", limit: 10, page: 1 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item: any) => item.source === "audit")).toBe(true);
    expect(setJsonCacheMock).toHaveBeenCalled();
  });
});
