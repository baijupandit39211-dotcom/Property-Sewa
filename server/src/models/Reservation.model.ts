import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReservationSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    paymentMethod: { type: String, enum: ["COD", "ONLINE"], default: "COD" },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELLED"],
      default: "PENDING",
    },
    reservationStatus: {
      type: String,
      enum: ["REQUESTED", "CONFIRMED", "CANCELLED", "EXPIRED"],
      default: "REQUESTED",
    },

    bookingAdvancePaisa: { type: Number, required: true },

    holdExpiresAt: { type: Date, required: true, index: true },

    contactSnapshot: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      message: { type: String, default: "" },
      preferredVisitDate: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

ReservationSchema.index({ propertyId: 1, reservationStatus: 1, holdExpiresAt: 1 });
ReservationSchema.index({ userId: 1, propertyId: 1, reservationStatus: 1, createdAt: -1 });

export type ReservationDoc = InferSchemaType<typeof ReservationSchema>;
const Reservation =
  mongoose.models.Reservation || mongoose.model("Reservation", ReservationSchema);
export default Reservation;
