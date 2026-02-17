import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AuditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true }, // e.g., user.status.updated
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema>;
const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
