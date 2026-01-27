import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PropertyViewSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },

    // Seller/agent who owns the property (copied for faster analytics queries)
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Optional (if viewer is logged in)
    viewerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },

    // Optional: dedupe / unique analytics
    sessionId: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    // Optional: store hashed IP if you want unique views later (do NOT store raw IP)
    ipHash: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ Useful index for “last 7 days views” per seller
PropertyViewSchema.index({ sellerId: 1, createdAt: -1 });
PropertyViewSchema.index({ propertyId: 1, createdAt: -1 });

export type PropertyViewDoc = InferSchemaType<typeof PropertyViewSchema>;
export default mongoose.model("PropertyView", PropertyViewSchema);
