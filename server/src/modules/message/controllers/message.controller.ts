import type { Request, Response, NextFunction } from "express";
import path from "path";
import cloudinary from "../../../config/cloudinary";
import { ApiError } from "../../../utils/apiError";
import Lead from "../../../models/Lead.model";
import messageService from "../services/message.services";
import emailService from "../services/email.services";
import notificationService from "../../notifications/services/notification.services";

async function uploadMessageFile(buffer: Buffer, mimetype: string, originalName: string) {
  const isImage = mimetype.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("Cloudinary cloud name is not configured");
  }

  return new Promise<{ url: string; downloadUrl: string; publicId: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "property-sewa/chat",
        resource_type: resourceType,
        type: "upload",
        access_mode: "public",
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Upload failed"));
        const fileFormat = String(result.format || "").trim();
        const extension =
          fileFormat && !String(result.public_id).toLowerCase().endsWith(`.${fileFormat.toLowerCase()}`)
            ? `.${fileFormat}`
            : "";
        const baseUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/v${result.version}/${result.public_id}${extension}`;
        const safeOriginalName = path.basename(originalName || `attachment${extension}`);

        resolve({
          url: baseUrl,
          downloadUrl: cloudinary.url(result.public_id, {
            resource_type: resourceType,
            type: "upload",
            secure: true,
            sign_url: false,
            version: result.version,
            format: fileFormat || undefined,
            flags: `attachment:${safeOriginalName}`,
          }),
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

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

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const count = await messageService.getUnreadCount(userId);
    return res.status(200).json({ success: true, count });
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

    const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const uploadFile = req.file;
    if (!rawText && !uploadFile) throw new ApiError(400, "Message text or file is required");

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

    let fileUrl: string | null = null;
    let fileDownloadUrl: string | null = null;
    let fileType: "image" | "file" | null = null;
    let fileName: string | null = null;

    if (uploadFile) {
      const uploaded = await uploadMessageFile(
        uploadFile.buffer,
        uploadFile.mimetype,
        uploadFile.originalname || "attachment"
      );
      fileUrl = uploaded.url;
      fileDownloadUrl = uploaded.downloadUrl;
      fileType = uploadFile.mimetype.startsWith("image/") ? "image" : "file";
      fileName = path.basename(uploadFile.originalname || "attachment");
    }

    const message = await messageService.createMessage({
      leadId: req.params.leadId,
      senderId: userId,
      receiverId: receiverId || "",
      senderRole,
      text: rawText,
      fileUrl,
      fileDownloadUrl,
      fileType,
      fileName,
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
            previewText: rawText || fileName || "Attachment",
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
                  ${rawText || fileName || "Attachment"}
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

// DELETE /messages/:leadId/:messageId (requireUserAuth)
export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const message = await messageService.deleteMessage(req.params.leadId, req.params.messageId, userId);
    return res.status(200).json({ success: true, message });
  } catch (err) {
    return next(err);
  }
}
