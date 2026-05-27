import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  feedbackCreateMock,
  feedbackFindMock,
  feedbackFindByIdAndUpdateMock,
  userFindMock,
} = vi.hoisted(() => ({
  feedbackCreateMock: vi.fn(),
  feedbackFindMock: vi.fn(),
  feedbackFindByIdAndUpdateMock: vi.fn(),
  userFindMock: vi.fn(),
}));

vi.mock("../../../models/Feedback.model", () => ({
  default: {
    create: feedbackCreateMock,
    find: feedbackFindMock,
    findByIdAndUpdate: feedbackFindByIdAndUpdateMock,
  },
}));

vi.mock("../../../models/User.model", () => ({
  default: {
    find: userFindMock,
  },
}));

import feedbackService from "./feedback.services";

describe("feedback.services (feedback management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createFeedback stores new item with default status", async () => {
    feedbackCreateMock.mockResolvedValueOnce({
      _id: "f1",
      status: "new",
      message: "Great app",
    });

    const item = await feedbackService.createFeedback({
      userId: "u1",
      userRole: "buyer",
      category: "ui",
      message: "Great app",
      rating: 5,
      allowContact: true,
    });

    expect(item.status).toBe("new");
    expect(feedbackCreateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "new" }));
  });

  it("getAdminFeedback enriches with user info and supports search", async () => {
    feedbackFindMock.mockReturnValueOnce({
      sort: vi.fn(() => ({
        lean: vi.fn(async () => [
          {
            _id: "f1",
            userId: "u1",
            userRole: "buyer",
            category: "support",
            rating: 4,
            message: "Need support on booking",
            allowContact: true,
            status: "new",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      })),
    });
    userFindMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        lean: vi.fn(async () => [{ _id: "u1", name: "Buyer One", email: "buyer@test.com" }]),
      })),
    });

    const result = await feedbackService.getAdminFeedback({ search: "booking" });
    expect(result.items.length).toBe(1);
    expect(result.items[0].userName).toBe("Buyer One");
    expect(result.counts.total).toBe(1);
  });

  it("updateFeedbackStatus returns updated item", async () => {
    feedbackFindByIdAndUpdateMock.mockReturnValueOnce({
      lean: vi.fn(async () => ({ _id: "f1", status: "resolved" })),
    });

    const item = await feedbackService.updateFeedbackStatus("f1", "resolved");
    expect(item.status).toBe("resolved");
  });
});
