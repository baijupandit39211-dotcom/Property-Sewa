import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PropertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // price usable for both buy/rent
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },

    location: { type: String, required: true },
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

    furnishing: {
      type: String,
      enum: ["unfurnished", "semi", "full"],
      default: null,
    },

    availabilityDate: { type: Date, default: null },
    monthlyRent: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },

    // booking/advance
    advanceAmount: { type: Number, default: 0 },

    // ✅ reservation state (FIXES TS ERROR)
    reservationStatus: {
      type: String,
      enum: ["none", "reserved", "paid", "cancelled", "expired"],
      default: "none",
    },
    reservedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reservedUntil: { type: Date, default: null },

    yearBuilt: { type: Number, default: 0 },
    floor: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 0 },

    facing: {
      type: String,
      enum: ["east", "west", "north", "south"],
      default: null,
    },

    roadAccessFt: { type: Number, default: 0 },
    landmark: { type: String, default: "" },

    amenities: [{ type: String, default: [] }],

    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "active", "rejected", "draft"],
      default: "pending",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export type PropertyDoc = InferSchemaType<typeof PropertySchema>;
export default mongoose.model("Property", PropertySchema);
