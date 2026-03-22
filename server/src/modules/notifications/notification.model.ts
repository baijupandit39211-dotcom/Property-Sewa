import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_DELIVERY_CHANNELS,
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_RECIPIENT_ROLES,
  NOTIFICATION_TYPES,
} from "./notification.types";

const NotificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: NOTIFICATION_RECIPIENT_ROLES,
      required: true,
      trim: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: NOTIFICATION_CATEGORIES,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    entityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPES,
      default: null,
      trim: true,
    },
    entityId: {
      type: String,
      default: null,
      trim: true,
    },
    link: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "medium",
      trim: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveryChannels: {
      type: [
        {
          type: String,
          enum: NOTIFICATION_DELIVERY_CHANNELS,
        },
      ],
      default: ["in_app"],
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
NotificationSchema.index(
  { entityType: 1, entityId: 1, recipientId: 1 },
  {
    partialFilterExpression: {
      entityType: { $type: "string" },
      entityId: { $type: "string" },
    },
  }
);
NotificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: "date" } } }
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export default Notification;
