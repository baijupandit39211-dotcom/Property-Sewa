import Lead from "../../../models/Lead.model";
import Message from "../../../models/Message.model";
import { emitChatNewMessage } from "../../../realtime/notification.socket";
import { ApiError } from "../../../utils/apiError";

const AUTO_REPLY_TEXT =
  "Hi, thank you for your interest in this property. How can I help you?";

export interface CreateMessageInput {
  leadId: string;
  senderId: string;
  receiverId: string;
  senderRole: "seller" | "buyer";
  text: string;
}

async function getMessagesByLead(leadId: string, userId: string) {
  // Verify user owns this lead (either as seller or buyer)
  const lead = await Lead.findById(leadId);
  if (!lead) throw new ApiError(404, "Lead not found");
  
  if (lead.sellerId.toString() !== userId && lead.buyerId?.toString() !== userId) {
    throw new ApiError(403, "You can only access messages for your own leads");
  }

  const messages = await Message.find({ leadId })
    .populate({
      path: "senderId",
      select: "name email"
    })
    .sort({ createdAt: 1 }); // Oldest first for chat thread

  return messages;
}

async function createMessage(input: CreateMessageInput) {
  // Verify user owns this lead (either as seller or buyer)
  const lead = await Lead.findById(input.leadId);
  if (!lead) throw new ApiError(404, "Lead not found");
  
  if (lead.sellerId.toString() !== input.senderId && lead.buyerId?.toString() !== input.senderId) {
    throw new ApiError(403, "You can only send messages for your own leads");
  }

  const shouldCheckAutoReply = input.senderRole === "buyer";
  const previousBuyerMessageCount = shouldCheckAutoReply
    ? await Message.countDocuments({
        leadId: input.leadId,
        senderRole: "buyer",
        isAutoReply: false,
      })
    : 0;

  const message = new Message({
    leadId: input.leadId,
    senderId: input.senderId,
    senderRole: input.senderRole,
    isAutoReply: false,
    text: input.text,
  });

  await message.save();
  
  // Populate sender info for response
  await message.populate({
    path: "senderId",
    select: "name email"
  });

  if (input.receiverId) {
    emitChatNewMessage(input.receiverId, {
      message: message.toObject(),
      senderId: input.senderId,
      receiverId: input.receiverId,
    });
  }

  if (
    shouldCheckAutoReply &&
    previousBuyerMessageCount === 0 &&
    lead.buyerId &&
    lead.sellerId
  ) {
    const existingAutoReply = await Message.findOne({
      leadId: input.leadId,
      isAutoReply: true,
    });

    if (!existingAutoReply) {
      const autoReply = new Message({
        leadId: input.leadId,
        senderId: lead.sellerId,
        senderRole: "seller",
        isAutoReply: true,
        text: AUTO_REPLY_TEXT,
      });

      await autoReply.save();
      await autoReply.populate({
        path: "senderId",
        select: "name email",
      });

      emitChatNewMessage(String(lead.buyerId), {
        message: autoReply.toObject(),
        senderId: String(lead.sellerId),
        receiverId: String(lead.buyerId),
      });
    }
  }

  return message;
}

export default {
  getMessagesByLead,
  createMessage,
};
