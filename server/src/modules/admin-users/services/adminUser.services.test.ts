import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindOneMock,
  userCreateMock,
  userFindByIdMock,
  auditLogCreateMock,
  invalidateAdminDashboardCacheMock,
  deleteByPatternMock,
} = vi.hoisted(() => ({
  userFindOneMock: vi.fn(),
  userCreateMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  auditLogCreateMock: vi.fn(async () => undefined),
  invalidateAdminDashboardCacheMock: vi.fn(async () => undefined),
  deleteByPatternMock: vi.fn(async () => undefined),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
  },
}));

vi.mock("../../../models/User.model", () => ({
  default: {
    findOne: userFindOneMock,
    create: userCreateMock,
    findById: userFindByIdMock,
    countDocuments: vi.fn(async () => 0),
    find: vi.fn(),
  },
}));

vi.mock("../../../models/AuditLog.model", () => ({
  default: {
    create: auditLogCreateMock,
  },
}));

vi.mock("../../admin-overview/services/adminOverview.services", () => ({
  invalidateAdminDashboardCache: invalidateAdminDashboardCacheMock,
}));

vi.mock("../../../utils/cache", () => ({
  deleteByPattern: deleteByPatternMock,
  getJsonCache: vi.fn(async () => null),
  makeCacheKey: vi.fn(() => "cache-key"),
  setJsonCache: vi.fn(async () => undefined),
}));

vi.mock("../../../utils/metrics", () => ({
  recordAdminUsersCacheResult: vi.fn(),
}));

vi.mock("../../../utils/devTiming", () => ({
  logDevTiming: vi.fn(),
  nowMs: vi.fn(() => 0),
}));

import { createUser, updateRole, updateStatus } from "./adminUser.services";

describe("adminUser.services (admin moderation and verification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-superadmin from creating admin accounts", async () => {
    await expect(
      createUser({
        actor: { userId: "a1", role: "admin" },
        body: {
          name: "New Admin",
          email: "newadmin@example.com",
          role: "admin",
          status: "active",
        },
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("creates normal user and writes audit log", async () => {
    userFindOneMock.mockResolvedValueOnce(null);
    userCreateMock.mockResolvedValueOnce({
      _id: "u1",
      name: "Buyer One",
      email: "buyer@example.com",
      role: "buyer",
      status: "active",
      archivedAt: null,
      provider: "local",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await createUser({
      actor: { userId: "super-1", role: "superadmin" },
      body: {
        name: "Buyer One",
        email: "buyer@example.com",
        role: "buyer",
        status: "active",
      },
    });

    expect(created.email).toBe("buyer@example.com");
    expect(auditLogCreateMock).toHaveBeenCalled();
    expect(deleteByPatternMock).toHaveBeenCalled();
    expect(invalidateAdminDashboardCacheMock).toHaveBeenCalled();
  });

  it("blocks users from changing their own status", async () => {
    await expect(
      updateStatus({
        actor: { userId: "u2", role: "admin" },
        targetUserId: "u2",
        status: "suspended",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("maps inactive status to archived and updates archivedAt", async () => {
    const save = vi.fn(async () => undefined);
    userFindByIdMock.mockResolvedValueOnce({
      _id: "u3",
      role: "buyer",
      status: "active",
      archivedAt: null,
      save,
    });

    const updated = await updateStatus({
      actor: { userId: "admin-1", role: "admin" },
      targetUserId: "u3",
      status: "inactive",
    });

    expect(updated.status).toBe("archived");
    expect(save).toHaveBeenCalled();
    expect(auditLogCreateMock).toHaveBeenCalled();
  });

  it("allows role update only by superadmin", async () => {
    await expect(
      updateRole({
        actor: { userId: "admin-1", role: "admin" },
        targetUserId: "u9",
        role: "seller",
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
