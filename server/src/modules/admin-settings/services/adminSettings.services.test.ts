import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindByIdMock,
  userFindOneMock,
  adminSettingsFindOneMock,
  adminSettingsCreateMock,
  adminSaveMock,
} = vi.hoisted(() => ({
  userFindByIdMock: vi.fn(),
  userFindOneMock: vi.fn(),
  adminSettingsFindOneMock: vi.fn(),
  adminSettingsCreateMock: vi.fn(),
  adminSaveMock: vi.fn(async () => undefined),
}));

vi.mock("../../../models/User.model", () => ({
  default: {
    findById: userFindByIdMock,
    findOne: userFindOneMock,
  },
}));

vi.mock("../../../models/AdminSettings.model", () => ({
  default: {
    findOne: adminSettingsFindOneMock,
    create: adminSettingsCreateMock,
  },
}));

import {
  getAdminSettings,
  updateAdminProfile,
  updateNotificationSettings,
  updatePlatformSettings,
} from "./adminSettings.services";

describe("adminSettings.services (admin settings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates singleton settings when missing and returns profile/settings", async () => {
    const settingsDoc: any = {
      platform: { platformName: "Property Sewa", supportEmail: "support@propertysewa.com" },
      operations: { featuredListingFee: 0, reportReviewSlaHours: 24 },
      notifications: { dailyDigest: true, digestHour: 9 },
      updatedAt: new Date(),
      updatedBy: null,
      save: adminSaveMock,
    };
    adminSettingsFindOneMock.mockResolvedValueOnce(null);
    adminSettingsCreateMock.mockResolvedValueOnce(settingsDoc);
    userFindByIdMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        lean: vi.fn(async () => ({
          _id: "a1",
          name: "Admin",
          email: "admin@test.com",
          role: "admin",
        })),
      })),
    });

    const result = await getAdminSettings("a1");
    expect(result.profile.email).toBe("admin@test.com");
    expect(result.settings.platform.platformName).toBe("Property Sewa");
  });

  it("updateAdminProfile rejects duplicate email", async () => {
    userFindByIdMock.mockResolvedValueOnce({
      _id: "a1",
      email: "admin@test.com",
      save: adminSaveMock,
    });
    userFindOneMock.mockResolvedValueOnce({ _id: "other" });

    await expect(
      updateAdminProfile("a1", { email: "duplicate@test.com" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("updatePlatformSettings clamps numeric boundaries", async () => {
    const settingsDoc: any = {
      platform: {
        platformName: "Property Sewa",
        supportEmail: "support@propertysewa.com",
        supportPhone: "",
        supportAddress: "",
        contactHours: "9-6",
        defaultCurrency: "NPR",
        defaultLocale: "en-NP",
        homepageHeadline: "Headline",
      },
      operations: {
        featuredListingFee: 0,
        reportReviewSlaHours: 24,
        newListingReviewRequired: true,
        allowBuyerReporting: true,
        allowGoogleLogin: true,
        maintenanceMode: false,
      },
      notifications: { digestHour: 9 },
      save: adminSaveMock,
      updatedAt: new Date(),
    };
    adminSettingsFindOneMock.mockResolvedValueOnce(settingsDoc);

    const result = await updatePlatformSettings("a1", {
      operations: {
        featuredListingFee: 999999999,
        reportReviewSlaHours: 0,
      },
    });

    expect(result.operations.featuredListingFee).toBe(1000000);
    expect(result.operations.reportReviewSlaHours).toBe(1);
  });

  it("updateNotificationSettings clamps digestHour to 0-23", async () => {
    const settingsDoc: any = {
      notifications: {
        emailOnNewReport: true,
        emailOnNewListing: true,
        emailOnNewUser: false,
        dailyDigest: true,
        digestHour: 9,
        productAnnouncements: false,
      },
      save: adminSaveMock,
      updatedAt: new Date(),
    };
    adminSettingsFindOneMock.mockResolvedValueOnce(settingsDoc);

    const result = await updateNotificationSettings("a1", {
      notifications: { digestHour: 99 },
    });

    expect(result.notifications.digestHour).toBe(23);
    expect(adminSaveMock).toHaveBeenCalled();
  });
});
