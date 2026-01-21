import mongoose, { Schema, Document } from "mongoose";

export interface IVisit extends Document {
  propertyId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  requestedDate: Date;
  preferredTime: string;
  status: "requested" | "confirmed" | "rejected" | "rescheduled" | "completed";
  message?: string;
  sellerResponse?: string;
  actualDate?: Date;
  actualTime?: string;
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
    enum: ["requested", "confirmed", "rejected", "rescheduled", "completed"],
    default: "requested",
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
}, {
  timestamps: true,
});

// Indexes for better performance
VisitSchema.index({ propertyId: 1, status: 1 });
VisitSchema.index({ buyerId: 1, status: 1 });
VisitSchema.index({ sellerId: 1, status: 1 });
VisitSchema.index({ requestedDate: 1, status: 1 });

export default mongoose.model<IVisit>("Visit", VisitSchema);
