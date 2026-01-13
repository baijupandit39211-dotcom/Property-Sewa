import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PropertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    price: { type: Number, required: true },
    currency: { type: String, default: "USD" },

    location: { type: String, required: true }, // e.g. Kathmandu, Nepal
    address: { type: String, default: "" },

    beds: { type: Number, default: 0 },
    baths: { type: Number, default: 0 },
    sqft: { type: Number, default: 0 },

    propertyType: {
      type: String,
      enum: ["house", "apartment", "condo", "land", "office", "other"],
      default: "house",
    },
    listingType: {
      type: String,
      enum: ["buy", "rent"],
      default: "buy",
    },

    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export type PropertyDoc = InferSchemaType<typeof PropertySchema>;
export default mongoose.model("Property", PropertySchema);
