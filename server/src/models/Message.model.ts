import mongoose, { Schema, type InferSchemaType } from "mongoose";

const MessageSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    senderRole: { 
      type: String, 
      enum: ["seller", "buyer"], 
      required: true 
    },
    isAutoReply: { type: Boolean, default: false },
    text: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: null },
    fileType: { type: String, enum: ["image", "file"], default: null },
    fileName: { type: String, default: null, trim: true },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
export default mongoose.model("Message", MessageSchema);
