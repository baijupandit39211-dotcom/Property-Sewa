import mongoose, { Schema, type InferSchemaType } from "mongoose";

const WishlistSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
  },
  { timestamps: true }
);

WishlistSchema.index({ buyerId: 1, propertyId: 1 }, { unique: true });
WishlistSchema.index({ buyerId: 1, createdAt: -1 });

export type WishlistDoc = InferSchemaType<typeof WishlistSchema>;
export default mongoose.model("Wishlist", WishlistSchema);
