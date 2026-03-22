import mongoose from "mongoose";
import { ApiError } from "../../../utils/apiError";
import {
  emitNotificationCreated,
  emitNotificationRead,
  emitNotificationReadAll,
} from "../../../realtime/notification.socket";
import Notification from "../notification.model";
import type {
  CreateNotificationInput,
  NotificationCategory,
  NotificationListFilters,
  NotificationListResult,
  NotificationPriority,
  NotificationType,
} from "../notification.types";

function ensureObjectId(value: string, fieldName: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function normalizePage(value: number | string | undefined) {
  return Math.max(1, Number(value || 1));
}

function normalizeLimit(value: number | string | undefined) {
  return Math.min(50, Math.max(1, Number(value || 20)));
}

function parseBooleanFilter(value: boolean | string | undefined) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

function normalizeOptionalString(value: string | undefined) {
  const normalized = String(value || "").trim();
  return normalized || undefined;
}

function buildListQuery(userId: string, filters: NotificationListFilters) {
  const query: Record<string, unknown> = { recipientId: userId };
  const isRead = parseBooleanFilter(filters.isRead);
  const category = normalizeOptionalString(filters.category);
  const type = normalizeOptionalString(filters.type);
  const priority = normalizeOptionalString(filters.priority);

  if (isRead !== undefined) query.isRead = isRead;
  if (category) query.category = category as NotificationCategory;
  if (type) query.type = type as NotificationType;
  if (priority) query.priority = priority as NotificationPriority;

  return query;
}

async function createNotification(input: CreateNotificationInput) {
  ensureObjectId(input.recipientId, "recipientId");

  if (input.actorId) {
    ensureObjectId(input.actorId, "actorId");
  }

  const notification = await Notification.create({
    recipientId: input.recipientId,
    recipientRole: input.recipientRole,
    actorId: input.actorId || null,
    type: input.type,
    category: input.category,
    title: input.title,
    body: input.body,
    data: input.data || {},
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    link: input.link || null,
    priority: input.priority || "medium",
    isRead: input.isRead ?? false,
    readAt: input.readAt || null,
    deliveryChannels: input.deliveryChannels?.length ? input.deliveryChannels : ["in_app"],
    emailSentAt: input.emailSentAt || null,
    expiresAt: input.expiresAt || null,
  });

  const recipientId = String(notification.recipientId);
  const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });
  emitNotificationCreated(recipientId, {
    notification: notification.toObject(),
    unreadCount,
  });

  return notification;
}

async function createBulkNotifications(inputs: CreateNotificationInput[]) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return [];
  }

  const docs = inputs.map((input) => {
    ensureObjectId(input.recipientId, "recipientId");

    if (input.actorId) {
      ensureObjectId(input.actorId, "actorId");
    }

    return {
      recipientId: input.recipientId,
      recipientRole: input.recipientRole,
      actorId: input.actorId || null,
      type: input.type,
      category: input.category,
      title: input.title,
      body: input.body,
      data: input.data || {},
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      link: input.link || null,
      priority: input.priority || "medium",
      isRead: input.isRead ?? false,
      readAt: input.readAt || null,
      deliveryChannels: input.deliveryChannels?.length ? input.deliveryChannels : ["in_app"],
      emailSentAt: input.emailSentAt || null,
      expiresAt: input.expiresAt || null,
    };
  });

  const notifications = await Notification.insertMany(docs, { ordered: false });

  const recipientIds = Array.from(new Set(notifications.map((item) => String(item.recipientId))));
  for (const recipientId of recipientIds) {
    const recipientNotifications = notifications
      .filter((item) => String(item.recipientId) === recipientId)
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
    const totalUnreadCount = await Notification.countDocuments({ recipientId, isRead: false });
    const baseUnreadCount = Math.max(0, totalUnreadCount - recipientNotifications.length);

    recipientNotifications
      .forEach((item) => {
        emitNotificationCreated(recipientId, {
          notification: item.toObject(),
          unreadCount: baseUnreadCount + recipientNotifications.indexOf(item) + 1,
        });
      });
  }

  return notifications;
}

async function getUserNotifications(
  userId: string,
  filters: NotificationListFilters = {}
): Promise<NotificationListResult<any>> {
  ensureObjectId(userId, "userId");

  const page = normalizePage(filters.page);
  const limit = normalizeLimit(filters.limit);
  const skip = (page - 1) * limit;
  const query = buildListQuery(userId, filters);

  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

async function getUnreadCount(userId: string) {
  ensureObjectId(userId, "userId");
  return Notification.countDocuments({ recipientId: userId, isRead: false });
}

async function markAsRead(notificationId: string, userId: string) {
  ensureObjectId(notificationId, "notificationId");
  ensureObjectId(userId, "userId");

  const notification = await Notification.findOne({
    _id: notificationId,
    recipientId: userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });
    emitNotificationRead(userId, {
      notificationId: String(notification._id),
      unreadCount,
      readAt: notification.readAt.toISOString(),
    });
  }

  return notification;
}

async function markAllAsRead(userId: string) {
  ensureObjectId(userId, "userId");

  const readAt = new Date();
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    {
      $set: {
        isRead: true,
        readAt,
      },
    }
  );

  emitNotificationReadAll(userId, {
    unreadCount: 0,
    readAt: readAt.toISOString(),
  });

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    readAt,
  };
}

export default {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
