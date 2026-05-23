import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AlertRuleSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    enabled: { type: Boolean, default: true },
    query: { type: String, default: "", trim: true, maxlength: 120 },
    location: { type: String, default: "", trim: true, maxlength: 120 },
    maxPrice: { type: Number, default: null },
    minBeds: { type: Number, default: null },
    minBaths: { type: Number, default: null },
    minSqft: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AlertItemSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    type: { type: String, enum: ["alerts", "visits", "offers"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    ctaLabel: { type: String, default: "", trim: true, maxlength: 80 },
    href: { type: String, default: "", trim: true, maxlength: 300 },
    imageUrl: { type: String, default: "", trim: true, maxlength: 600 },
    createdAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false, index: true },
  },
  { _id: false }
);

const BuyerAlertStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    preferences: {
      alertsEnabled: { type: Boolean, default: true },
      visitsEnabled: { type: Boolean, default: true },
      offersEnabled: { type: Boolean, default: true },
    },
    rules: { type: [AlertRuleSchema], default: [] },
    items: { type: [AlertItemSchema], default: [] },
    lastOfferSyncAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type BuyerAlertStateDoc = InferSchemaType<typeof BuyerAlertStateSchema>;
const BuyerAlertState =
  mongoose.models.BuyerAlertState || mongoose.model("BuyerAlertState", BuyerAlertStateSchema);
export default BuyerAlertState;