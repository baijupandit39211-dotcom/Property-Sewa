import mongoose, { Schema, Document } from "mongoose";

export interface IVisit extends Document {
  propertyId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId | null;
  visitType: "in_person" | "virtual" | "site_tour";
  preferredDate?: Date;
  preferredTimeSlot?: string;
  requestedDate: Date;
  preferredTime: string;
  status:
    | "requested"
    | "confirmed"
    | "rescheduled"
    | "rejected"
    | "cancelled"
    | "completed"
    | "no_show";
  buyerMessage?: string;
  sellerNote?: string;
  message?: string;
  sellerResponse?: string;
  actualDate?: Date;
  actualTime?: string;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema: Schema = new Schema({
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  buyerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  leadId: {
    type: Schema.Types.ObjectId,
    ref: "Lead",
    default: null,
  },
  visitType: {
    type: String,
    enum: ["in_person", "virtual", "site_tour"],
    default: "in_person",
  },
  preferredDate: {
    type: Date,
    default: null,
  },
  preferredTimeSlot: {
    type: String,
    trim: true,
    default: "",
  },
  requestedDate: {
    type: Date,
    required: true,
  },
  preferredTime: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["requested", "confirmed", "rescheduled", "rejected", "cancelled", "completed", "no_show"],
    default: "requested",
  },
  buyerMessage: {
    type: String,
    trim: true,
    default: "",
  },
  sellerNote: {
    type: String,
    trim: true,
    default: "",
  },
  message: {
    type: String,
    trim: true,
  },
  sellerResponse: {
    type: String,
    trim: true,
  },
  actualDate: {
    type: Date,
  },
  actualTime: {
    type: String,
    trim: true,
  },
  confirmedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better performance
VisitSchema.index({ propertyId: 1, status: 1 });
VisitSchema.index({ buyerId: 1, status: 1 });
VisitSchema.index({ sellerId: 1, status: 1 });
VisitSchema.index({ requestedDate: 1, status: 1 });
VisitSchema.index({ sellerId: 1, createdAt: -1 });
VisitSchema.index({ sellerId: 1, propertyId: 1, createdAt: -1 });
VisitSchema.index({ buyerId: 1, propertyId: 1, createdAt: -1 });

export default mongoose.model<IVisit>("Visit", VisitSchema);
