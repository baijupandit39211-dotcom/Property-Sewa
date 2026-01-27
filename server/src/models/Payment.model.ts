import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PaymentSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    gateway: { type: String, enum: ["khalti", "esewa"], required: true },
    amount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "expired", "failed"],
      default: "pending",
    },

    // khalti refs
    khalti_pidx: { type: String, default: "" },
    khalti_txnId: { type: String, default: "" },

    // esewa refs
    esewa_refId: { type: String, default: "" },

    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// existing
PaymentSchema.index({ status: 1, expiresAt: 1 });

// ✅ faster queries (recommended)
PaymentSchema.index({ propertyId: 1, buyerId: 1, status: 1, createdAt: -1 });

// ✅ optional: only one pending payment per buyer+property
PaymentSchema.index(
  { propertyId: 1, buyerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;
export default mongoose.model("Payment", PaymentSchema);
