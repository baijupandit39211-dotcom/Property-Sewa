export const NOTIFICATION_TYPES = [
  "message.new",
  "order.created",
  "order.updated",
  "order.confirmed",
  "order.cancelled",
  "payment.success",
  "payment.failed",
  "alert.general",
] as const;

export const NOTIFICATION_CATEGORIES = [
  "message",
  "order",
  "payment",
  "alert",
] as const;

export const NOTIFICATION_PRIORITIES = ["low", "medium", "high"] as const;

export const NOTIFICATION_ENTITY_TYPES = [
  "message",
  "lead",
  "order",
  "reservation",
  "payment",
  "property",
  "user",
  "system",
] as const;

export const NOTIFICATION_DELIVERY_CHANNELS = ["in_app", "email"] as const;

export const NOTIFICATION_RECIPIENT_ROLES = ["buyer", "seller"] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPES)[number];
export type NotificationDeliveryChannel = (typeof NOTIFICATION_DELIVERY_CHANNELS)[number];
export type NotificationRecipientRole = (typeof NOTIFICATION_RECIPIENT_ROLES)[number];

export type NotificationData = Record<string, unknown>;

export type CreateNotificationInput = {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  actorId?: string | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: NotificationData;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  link?: string | null;
  priority?: NotificationPriority;
  deliveryChannels?: NotificationDeliveryChannel[];
  emailSentAt?: Date | null;
  expiresAt?: Date | null;
  isRead?: boolean;
  readAt?: Date | null;
};

export type NotificationListFilters = {
  page?: number | string;
  limit?: number | string;
  isRead?: boolean | string;
  category?: NotificationCategory | string;
  type?: NotificationType | string;
  priority?: NotificationPriority | string;
};

export type NotificationListResult<TItem> = {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
