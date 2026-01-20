import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/apiError";
import Lead from "../../../models/Lead.model";
import messageService from "../services/message.services";

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

// POST /messages/:leadId (requireUserAuth)
export async function createMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { text } = req.body;
    if (!text) throw new ApiError(400, "Message text is required");

    // Get lead to determine user role
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) throw new ApiError(404, "Lead not found");

    // Determine sender role based on lead ownership
    let senderRole: "seller" | "buyer";
    if (lead.sellerId.toString() === userId) {
      senderRole = "seller";
    } else if (lead.buyerId?.toString() === userId) {
      senderRole = "buyer";
    } else {
      throw new ApiError(403, "You can only send messages for your own leads");
    }

    const message = await messageService.createMessage({
      leadId: req.params.leadId,
      senderId: userId,
      senderRole,
      text,
    });

    return res.status(201).json({ success: true, message });
  } catch (err) {
    return next(err);
  }
}
