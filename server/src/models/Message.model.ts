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
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
export default mongoose.model("Message", MessageSchema);
