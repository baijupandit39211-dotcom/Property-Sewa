import mongoose, { Schema, type InferSchemaType } from "mongoose";

const InquirySchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Optional: if buyer is logged in
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    // Form fields (from your inquiry form)
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    message: { type: String, default: "" },

    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

InquirySchema.index({ sellerId: 1, createdAt: -1 });
InquirySchema.index({ propertyId: 1, createdAt: -1 });

export type InquiryDoc = InferSchemaType<typeof InquirySchema>;
export default mongoose.model("Inquiry", InquirySchema);
