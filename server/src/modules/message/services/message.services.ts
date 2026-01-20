import Lead from "../../../models/Lead.model";
import Message from "../../../models/Message.model";
import { ApiError } from "../../../utils/apiError";

export interface CreateMessageInput {
  leadId: string;
  senderId: string;
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

  const message = new Message({
    leadId: input.leadId,
    senderId: input.senderId,
    senderRole: input.senderRole,
    text: input.text,
  });

  await message.save();
  
  // Populate sender info for response
  await message.populate({
    path: "senderId",
    select: "name email"
  });

  return message;
}

export default {
  getMessagesByLead,
  createMessage,
};
