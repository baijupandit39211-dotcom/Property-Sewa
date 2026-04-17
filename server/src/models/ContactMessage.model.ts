import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    inquiryType: { type: String, required: true, trim: true, maxlength: 80 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved"],
      default: "new",
      index: true,
    },
    lastRepliedAt: { type: Date, default: null },
    lastReplySubject: { type: String, default: "", trim: true, maxlength: 200 },
    repliedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true }
);

ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ email: 1, createdAt: -1 });
ContactMessageSchema.index({ status: 1, lastRepliedAt: -1 });

export type ContactMessageDoc = InferSchemaType<typeof ContactMessageSchema>;

export default mongoose.model("ContactMessage", ContactMessageSchema);
