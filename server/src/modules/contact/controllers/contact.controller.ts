import type { NextFunction, Request, Response } from "express";
import ContactMessage from "../../../models/ContactMessage.model";
import {
  sendContactAdminNotificationEmail,
  sendContactAdminReplyEmail,
  sendContactConfirmationEmail,
  sendContactResolvedStatusEmail,
  sendContactReviewedStatusEmail,
} from "../../../services/email.service";
import { createAdminContactNotifications } from "../services/contactNotification.service";
import { generateContactReplyDraft } from "../services/contactAi.service";
import { logger } from "../../../utils/logger";
import { ApiError } from "../../../utils/apiError";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[0-9+\-\s()]{7,20}$/.test(phone);
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function getContactStatusEmailSender(status: "reviewed" | "resolved") {
  return status === "reviewed"
    ? sendContactReviewedStatusEmail
    : sendContactResolvedStatusEmail;
}

function canTransitionStatus(
  currentStatus: "new" | "reviewed" | "resolved",
  nextStatus: "new" | "reviewed" | "resolved"
) {
  if (currentStatus === nextStatus) {
    return { allowed: true, reason: "same_status" as const };
  }

  if (currentStatus === "new" && (nextStatus === "reviewed" || nextStatus === "resolved")) {
    return { allowed: true, reason: "forward" as const };
  }

  if (currentStatus === "reviewed" && nextStatus === "resolved") {
    return { allowed: true, reason: "forward" as const };
  }

  return { allowed: false, reason: "invalid_transition" as const };
}

export async function createContactMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const inquiryType = String(req.body?.inquiryType || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name) throw new ApiError(400, "Please enter your full name.");
    if (!email) throw new ApiError(400, "Please enter your email address.");
    if (!isValidEmail(email)) throw new ApiError(400, "Please enter a valid email address.");
    if (!phone) throw new ApiError(400, "Please enter your phone number.");
    if (!isValidPhone(phone)) throw new ApiError(400, "Please enter a valid phone number.");
    if (!inquiryType) throw new ApiError(400, "Please select an inquiry type.");
    if (!subject) throw new ApiError(400, "Please enter a subject.");
    if (subject.length < 4) throw new ApiError(400, "Subject should be at least 4 characters.");
    if (!message) throw new ApiError(400, "Please write your message.");
    if (message.length < 12) throw new ApiError(400, "Message should be at least 12 characters.");

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      inquiryType,
      subject,
      message,
    });

    const emailPayload = {
      name,
      email,
      phone,
      inquiryType,
      subject,
      message,
    };

    const sideEffectResults = await Promise.allSettled([
      createAdminContactNotifications({
        contactId: String(contactMessage._id),
        name,
        email,
        inquiryType,
        subject,
      }),
      sendContactAdminNotificationEmail(emailPayload),
      sendContactConfirmationEmail(emailPayload),
    ]);

    sideEffectResults.forEach((result, index) => {
      if (result.status === "fulfilled") return;

      const sideEffectLabel =
        index === 0
          ? "admin contact notification"
          : index === 1
            ? "contact admin notification email"
            : "contact confirmation email";

      logger.error(`Failed to process ${sideEffectLabel}:`, result.reason);
    });

    return res.status(201).json({
      success: true,
      message: "Your message has been sent successfully.",
      item: contactMessage,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getContactMessages(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const status = String(req.query?.status || "").trim().toLowerCase();
    const search = String(req.query?.search || "").trim();

    const query: Record<string, unknown> = {};

    if (status && ["new", "reviewed", "resolved"].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { inquiryType: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const items = await ContactMessage.find(query).sort({ createdAt: -1 }).lean();

    const counts = {
      total: items.length,
      new: items.filter((item) => item.status === "new").length,
      reviewed: items.filter((item) => item.status === "reviewed").length,
      resolved: items.filter((item) => item.status === "resolved").length,
    };

    return res.status(200).json({
      success: true,
      counts,
      items: items.map((item) => ({
        id: String(item._id),
        name: item.name,
        email: item.email,
        phone: item.phone,
        inquiryType: item.inquiryType,
        subject: item.subject,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateContactMessageStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contactId = normalizeText(req.params?.contactId);
    const status = normalizeText(req.body?.status).toLowerCase() as "new" | "reviewed" | "resolved";

    if (!contactId) throw new ApiError(400, "Contact message id is required.");
    if (!["new", "reviewed", "resolved"].includes(status)) {
      throw new ApiError(400, "Invalid contact message status.");
    }

    const existing = await ContactMessage.findById(contactId).lean();
    if (!existing) throw new ApiError(404, "Contact message not found.");

    const currentStatus = existing.status as "new" | "reviewed" | "resolved";
    const transition = canTransitionStatus(currentStatus, status);
    if (!transition.allowed) {
      throw new ApiError(400, `Invalid status transition from "${currentStatus}" to "${status}".`);
    }

    if (currentStatus === status) {
      return res.status(200).json({
        success: true,
        item: {
          id: String(existing._id),
          status: existing.status,
          updatedAt: existing.updatedAt,
        },
        meta: {
          statusEmailAttempted: false,
          statusEmailSent: false,
          statusEmailFailed: false,
          statusEmailType: null,
          reason: "same_status",
        },
      });
    }

    const item = await ContactMessage.findByIdAndUpdate(contactId, { status }, { new: true }).lean();
    if (!item) throw new ApiError(404, "Contact message not found.");

    let meta = {
      statusEmailAttempted: false,
      statusEmailSent: false,
      statusEmailFailed: false,
      statusEmailType: null as null | "reviewed" | "resolved",
    };

    if (status === "reviewed" || status === "resolved") {
      meta = {
        statusEmailAttempted: true,
        statusEmailSent: false,
        statusEmailFailed: false,
        statusEmailType: status,
      };

      try {
        await getContactStatusEmailSender(status)({
          name: item.name,
          email: item.email,
          inquiryType: item.inquiryType,
          subject: item.subject,
        });
        meta.statusEmailSent = true;
      } catch (error) {
        meta.statusEmailFailed = true;
        logger.error("Failed to send contact status email:", {
          contactId,
          status,
          email: item.email,
          error,
        });
      }
    }

    return res.status(200).json({
      success: true,
      item: {
        id: String(item._id),
        status: item.status,
        updatedAt: item.updatedAt,
      },
      meta,
    });
  } catch (err) {
    return next(err);
  }
}

export async function replyToContactMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contactId = normalizeText(req.params?.contactId);
    const subject = normalizeText(req.body?.subject);
    const message = normalizeText(req.body?.message);
    const adminUserId = req.user?.userId ? String(req.user.userId) : null;

    if (!contactId) throw new ApiError(400, "Contact message id is required.");
    if (!subject) throw new ApiError(400, "Reply subject is required.");
    if (subject.length < 4) throw new ApiError(400, "Reply subject should be at least 4 characters.");
    if (!message) throw new ApiError(400, "Reply message is required.");
    if (message.length < 12) throw new ApiError(400, "Reply message should be at least 12 characters.");

    const existing = await ContactMessage.findById(contactId).lean();
    if (!existing) throw new ApiError(404, "Contact message not found.");

    const nextStatus = existing.status === "new" ? "reviewed" : existing.status;
    const update: Record<string, unknown> = {
      lastRepliedAt: new Date(),
      lastReplySubject: subject,
      status: nextStatus,
    };

    if (adminUserId) {
      update.repliedBy = adminUserId;
    }

    const item = await ContactMessage.findByIdAndUpdate(contactId, update, { new: true }).lean();
    if (!item) throw new ApiError(404, "Contact message not found.");

    let replyEmailSent = false;
    let replyEmailFailed = false;

    try {
      await sendContactAdminReplyEmail({
        name: item.name,
        email: item.email,
        inquiryType: item.inquiryType,
        subject: item.subject,
        replySubject: subject,
        replyMessage: message,
      });
      replyEmailSent = true;
    } catch (error) {
      replyEmailFailed = true;
      logger.error("Failed to send admin reply email:", {
        contactId,
        email: item.email,
        repliedBy: adminUserId,
        error,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully.",
      item: {
        id: String(item._id),
        status: item.status,
        lastRepliedAt: item.lastRepliedAt,
        lastReplySubject: item.lastReplySubject,
        repliedBy: item.repliedBy ? String(item.repliedBy) : null,
      },
      meta: {
        replyEmailSent,
        replyEmailFailed,
        autoMarkedReviewed: existing.status === "new" && item.status === "reviewed",
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function generateContactReplySuggestion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const contactId = normalizeText(req.params?.contactId);
    if (!contactId) throw new ApiError(400, "Contact message id is required.");

    const result = await generateContactReplyDraft(contactId);

    return res.status(200).json({
      success: true,
      message: result.fallback
        ? "AI reply draft generated with fallback mode."
        : "AI reply draft generated successfully.",
      data: {
        subject: result.subject,
        draft: result.draft,
      },
      meta: {
        model: result.model,
        fallback: result.fallback,
        fallbackReason: result.fallbackReason || null,
      },
    });
  } catch (err) {
    return next(err);
  }
}
