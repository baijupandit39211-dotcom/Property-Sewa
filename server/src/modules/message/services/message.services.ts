import Lead from "../../../models/Lead.model";
import Message from "../../../models/Message.model";
import { emitChatMessageDeleted, emitChatNewMessage } from "../../../realtime/notification.socket";
import { ApiError } from "../../../utils/apiError";

const AUTO_REPLY_TEXT =
  "Hi, thank you for your interest in this property. How can I help you?";

export interface CreateMessageInput {
  leadId: string;
  senderId: string;
  receiverId: string;
  senderRole: "seller" | "buyer";
  text: string;
  fileUrl?: string | null;
  fileDownloadUrl?: string | null;
  fileType?: "image" | "file" | null;
  fileName?: string | null;
}

async function getSellerReplySuggestions(leadId: string, userId: string) {
  const lead = await Lead.findById(leadId).populate({
    path: "propertyId",
    select: "title location price currency status",
  });
  if (!lead) throw new ApiError(404, "Lead not found");

  if (lead.sellerId.toString() !== userId) {
    throw new ApiError(403, "Only the seller can access reply suggestions");
  }

  const latestMessages = await Message.find({ leadId })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const latestBuyerMessage = latestMessages.find((message) => message.senderRole === "buyer" && !message.isAutoReply);
  if (!latestBuyerMessage) {
    return [];
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return [];
  }

  const property = lead.propertyId as any;
  const propertySummary = [
    property?.title ? `Title: ${property.title}` : "",
    property?.location ? `Location: ${property.location}` : "",
    property?.price ? `Price: ${property.currency || "Rs"} ${Number(property.price).toLocaleString()}` : "",
    property?.status ? `Status: ${property.status}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const chatSummary = latestMessages
    .slice()
    .reverse()
    .map((message) => `${message.senderRole === "seller" ? "Seller" : "Buyer"}: ${message.text}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SMART_REPLY_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You write concise seller smart replies for a real estate chat. Return exactly 3 short professional reply suggestions as plain lines, no numbering, no markdown.",
        },
        {
          role: "user",
          content: `Property summary:\n${propertySummary || "No property summary available"}\n\nRecent chat:\n${chatSummary}\n\nLatest buyer message:\n${latestBuyerMessage.text}`,
        },
      ],
      max_output_tokens: 120,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { output_text?: string };
  const suggestions = String(data.output_text || "")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*\d.\s]+/, ""))
    .filter(Boolean);

  return [...new Set(suggestions)].slice(0, 3);
}

async function getMessagesByLead(leadId: string, userId: string) {
  // Verify user owns this lead (either as seller or buyer)
  const lead = await Lead.findById(leadId).select("sellerId buyerId").lean();
  if (!lead) throw new ApiError(404, "Lead not found");
  
  if (String(lead.sellerId) !== userId && String(lead.buyerId || "") !== userId) {
    throw new ApiError(403, "You can only access messages for your own leads");
  }

  const messages = await Message.find({ leadId })
    .populate({
      path: "senderId",
      select: "name email"
    })
    .sort({ createdAt: 1 }) // Oldest first for chat thread
    .lean();

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
    fileUrl: input.fileUrl || null,
    fileDownloadUrl: input.fileDownloadUrl || null,
    fileType: input.fileType || null,
    fileName: input.fileName || null,
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

async function deleteMessage(leadId: string, messageId: string, userId: string) {
  const lead = await Lead.findById(leadId).select("sellerId buyerId").lean();
  if (!lead) throw new ApiError(404, "Lead not found");

  const sellerId = String(lead.sellerId || "");
  const buyerId = String(lead.buyerId || "");
  if (sellerId !== userId && buyerId !== userId) {
    throw new ApiError(403, "You can only manage messages for your own leads");
  }

  const message = await Message.findOne({ _id: messageId, leadId });
  if (!message) throw new ApiError(404, "Message not found");
  if (message.senderId?.toString() !== userId) {
    throw new ApiError(403, "You can only delete your own messages");
  }
  if (message.isDeleted) {
    return message;
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.text = "";
  message.fileUrl = null;
  message.fileDownloadUrl = null;
  message.fileType = null;
  message.fileName = null;
  await message.save();

  const receiverId = sellerId === userId ? buyerId : sellerId;
  if (receiverId) {
    emitChatMessageDeleted(receiverId, {
      leadId,
      messageId: String(message._id),
      deletedAt: message.deletedAt.toISOString(),
    });
  }

  return message;
}

export default {
  getMessagesByLead,
  createMessage,
  deleteMessage,
  getSellerReplySuggestions,
};
