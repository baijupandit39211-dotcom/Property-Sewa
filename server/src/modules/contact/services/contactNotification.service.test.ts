import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindMock,
  createBulkNotificationsMock,
} = vi.hoisted(() => ({
  userFindMock: vi.fn(),
  createBulkNotificationsMock: vi.fn(async (items: any[]) => items),
}));

vi.mock("../../../models/User.model", () => ({
  default: {
    find: userFindMock,
  },
}));

vi.mock("../../notifications/services/notification.services", () => ({
  default: {
    createBulkNotifications: createBulkNotificationsMock,
  },
}));

vi.mock("../../../utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { createAdminContactNotifications } from "./contactNotification.service";

describe("contactNotification.service (contact management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when no active admins", async () => {
    userFindMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        lean: vi.fn(async () => []),
      })),
    });

    const result = await createAdminContactNotifications({
      contactId: "c1",
      name: "John",
      email: "john@example.com",
      inquiryType: "buy",
      subject: "Need details",
    });

    expect(result).toEqual([]);
    expect(createBulkNotificationsMock).not.toHaveBeenCalled();
  });

  it("creates one notification per admin", async () => {
    userFindMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        lean: vi.fn(async () => [{ _id: "a1" }, { _id: "a2" }]),
      })),
    });

    const result = await createAdminContactNotifications({
      contactId: "c2",
      name: "Jane",
      email: "jane@example.com",
      inquiryType: "support",
      subject: "Issue with listing",
    });

    expect(createBulkNotificationsMock).toHaveBeenCalledOnce();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });
});
