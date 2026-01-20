import mongoose, { Schema, type InferSchemaType } from "mongoose";

const LeadSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

export type LeadDoc = InferSchemaType<typeof LeadSchema>;
export default mongoose.model("Lead", LeadSchema);
