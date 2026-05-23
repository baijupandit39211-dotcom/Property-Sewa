import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: {
      type: String,
      enum: ["buyer", "seller", "agent", "admin", "superadmin"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["ui", "performance", "bug", "feature", "content", "support", "other"],
      required: true,
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true, index: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    allowContact: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ userRole: 1, status: 1, category: 1, rating: 1, createdAt: -1 });

export type FeedbackDoc = InferSchemaType<typeof FeedbackSchema>;
const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
export default Feedback;