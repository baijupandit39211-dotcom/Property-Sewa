import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import Lead from "../../../models/Lead.model";
import messageService from "../services/message.services";
import emailService from "../services/email.services";
import notificationService from "../../notifications/services/notification.services";

// GET /messages/:leadId (requireUserAuth)
export async function getMessagesByLead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const messages = await messageService.getMessagesByLead(req.params.leadId, userId);
    return res.status(200).json({ success: true, items: messages });
  } catch (err) {
    return next(err);
  }
}

// GET /messages/:leadId/suggestions (requireUserAuth)
export async function getSellerReplySuggestions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const suggestions = await messageService.getSellerReplySuggestions(req.params.leadId, userId);
    return res.status(200).json({ success: true, suggestions });
  } catch (err) {
    return next(err);
  }
}

// POST /messages/:leadId (requireUserAuth)
export async function createMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { text } = req.body;
    if (!text) throw new ApiError(400, "Message text is required");

    // Get lead to determine user role and property info
    const lead = await Lead.findById(req.params.leadId).populate('propertyId');
    if (!lead) throw new ApiError(404, "Lead not found");

    // Determine sender role based on lead ownership
    let senderRole: "seller" | "buyer";
    let sellerId: string;
    let buyerId: string;
    let receiverId: string | null = null;
    let receiverRole: "seller" | "buyer" | null = null;
    
    if (lead.sellerId.toString() === userId) {
      senderRole = "seller";
      sellerId = userId;
      buyerId = lead.buyerId?.toString() || "";
      receiverId = buyerId || null;
      receiverRole = buyerId ? "buyer" : null;
    } else if (lead.buyerId?.toString() === userId) {
      senderRole = "buyer";
      sellerId = lead.sellerId.toString();
      buyerId = userId;
      receiverId = sellerId;
      receiverRole = "seller";
    } else {
      throw new ApiError(403, "You can only send messages for your own leads");
    }

    const message = await messageService.createMessage({
      leadId: req.params.leadId,
      senderId: userId,
      receiverId: receiverId || "",
      senderRole,
      text,
    });

    if (senderRole === "seller" && lead.status === "new") {
      lead.status = "contacted";
      await lead.save();
    }

    if (receiverId && receiverRole) {
      const propertyTitle = (lead.propertyId as any)?.title || "Property";
      const notificationLink =
        receiverRole === "seller"
          ? "/seller/messages"
          : `/buyer/messages/${req.params.leadId}`;

      try {
        console.log("[messages] creating notification for new message", {
          leadId: req.params.leadId,
          messageId: String(message._id),
          senderId: userId,
          senderRole,
          receiverId,
          receiverRole,
          notificationLink,
        });

        await notificationService.createNotification({
          recipientId: receiverId,
          recipientRole: receiverRole,
          actorId: userId,
          type: "message.new",
          category: "message",
          title: "New message received",
          body: `You received a new message about ${propertyTitle}.`,
          data: {
            leadId: req.params.leadId,
            messageId: String(message._id),
            propertyId: lead.propertyId ? String((lead.propertyId as any)?._id || lead.propertyId) : null,
            senderRole,
            previewText: text,
          },
          entityType: "lead",
          entityId: req.params.leadId,
          link: notificationLink,
          priority: "medium",
          deliveryChannels: ["in_app"],
        });

        console.log("[messages] notification creation completed", {
          leadId: req.params.leadId,
          messageId: String(message._id),
          receiverId,
        });
      } catch (notificationError) {
        console.error("Failed to create message notification:", notificationError);
      }
    }

    // Send email notification to seller if buyer sends message
    if (senderRole === "buyer" && sellerId) {
      const propertyTitle = (lead.propertyId as any)?.title || 'Property';
      emailService.sendNewMessageNotification({
        to: sellerId,
        subject: `New message about ${propertyTitle}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <div style="color: #333; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                📬 New Message Received
              </div>
              <div style="background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
                <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
                  <strong>From:</strong> ${lead.name}
                </div>
                <div style="color: #333; font-size: 14px; margin-bottom: 8px;">
                  <strong>Property:</strong> ${propertyTitle}
                </div>
                <div style="color: #333; font-size: 14px; margin-bottom: 8px;">
                  <strong>Message:</strong>
                </div>
                <div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; color: #666; font-style: italic;">
                  ${text}
                </div>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL}/seller/messages" 
                   style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Open Chat to Reply
                </a>
              </div>
            </div>
          </div>
        `,
        leadId: req.params.leadId,
      });
    }

    return res.status(201).json({ success: true, message });
  } catch (err) {
    return next(err);
  }
}
