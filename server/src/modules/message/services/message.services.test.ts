import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../utils/apiError";

const {
  leadFindByIdMock,
  messageFindMock,
  messageFindOneMock,
  messageCountDocumentsMock,
  notificationCountDocumentsMock,
  emitChatNewMessageMock,
  emitChatMessageDeletedMock,
  messageSaveMock,
  messagePopulateMock,
  messageToObjectMock,
} = vi.hoisted(() => {
  const save = vi.fn(async () => undefined);
  const populate = vi.fn(async () => undefined);
  const toObject = vi.fn(() => ({ _id: "m1", text: "hello" }));

  return {
    leadFindByIdMock: vi.fn(),
    messageFindMock: vi.fn(),
    messageFindOneMock: vi.fn(),
    messageCountDocumentsMock: vi.fn(),
    notificationCountDocumentsMock: vi.fn(),
    emitChatNewMessageMock: vi.fn(),
    emitChatMessageDeletedMock: vi.fn(),
    messageSaveMock: save,
    messagePopulateMock: populate,
    messageToObjectMock: toObject,
  };
});

vi.mock("../../../models/Lead.model", () => ({
  default: {
    findById: leadFindByIdMock,
  },
}));

vi.mock("../../../models/Message.model", () => {
  const MessageCtor = vi.fn(function (this: any, payload: any) {
    Object.assign(this, payload, {
      _id: "m1",
      isDeleted: false,
      save: messageSaveMock,
      populate: messagePopulateMock,
      toObject: messageToObjectMock,
    });
  });

  return {
    default: Object.assign(MessageCtor, {
      find: messageFindMock,
      findOne: messageFindOneMock,
      countDocuments: messageCountDocumentsMock,
    }),
  };
});

vi.mock("../../notifications/notification.model", () => ({
  default: {
    countDocuments: notificationCountDocumentsMock,
  },
}));

vi.mock("../../../realtime/notification.socket", () => ({
  emitChatNewMessage: emitChatNewMessageMock,
  emitChatMessageDeleted: emitChatMessageDeletedMock,
}));

import messageService from "./message.services";

describe("message.services (inquiry and real-time messaging)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "";
  });

  it("getMessagesByLead throws 403 when user does not own the lead", async () => {
    leadFindByIdMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        lean: vi.fn(async () => ({ sellerId: "seller-1", buyerId: "buyer-1" })),
      })),
    });

    await expect(messageService.getMessagesByLead("lead-1", "other-user")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("createMessage throws 403 when sender is not lead owner", async () => {
    leadFindByIdMock.mockResolvedValueOnce({
      sellerId: { toString: () => "seller-1" },
      buyerId: { toString: () => "buyer-1" },
    });

    await expect(
      messageService.createMessage({
        leadId: "lead-1",
        senderId: "intruder",
        receiverId: "seller-1",
        senderRole: "buyer",
        text: "Hi",
      })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("createMessage creates buyer message and first auto-reply", async () => {
    leadFindByIdMock.mockResolvedValueOnce({
      sellerId: { toString: () => "seller-1" },
      buyerId: { toString: () => "buyer-1" },
    });
    messageCountDocumentsMock.mockResolvedValueOnce(0);
    messageFindOneMock.mockResolvedValueOnce(null);

    const message = await messageService.createMessage({
      leadId: "lead-1",
      senderId: "buyer-1",
      receiverId: "seller-1",
      senderRole: "buyer",
      text: "Is this still available?",
    });

    expect(message).toBeTruthy();
    expect(messageSaveMock).toHaveBeenCalled();
    expect(emitChatNewMessageMock).toHaveBeenCalled();
    expect(messageFindOneMock).toHaveBeenCalledWith({
      leadId: "lead-1",
      isAutoReply: true,
    });
  });

  it("getUnreadCount returns unread message notification count", async () => {
    notificationCountDocumentsMock.mockResolvedValueOnce(7);
    const count = await messageService.getUnreadCount("user-1");
    expect(count).toBe(7);
    expect(notificationCountDocumentsMock).toHaveBeenCalledWith({
      recipientId: "user-1",
      category: "message",
      isRead: false,
    });
  });
});
