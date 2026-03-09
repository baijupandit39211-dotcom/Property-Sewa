import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  REPORT_ACTION_TYPES,
  REPORT_REASONS,
  REPORT_STATUSES,
} from "./report.validation";

function attachAliases(_doc: unknown, ret: Record<string, any>) {
  ret.property = ret.propertyId ?? ret.adId ?? null;
  ret.reporter = ret.reporterId ?? null;
  ret.owner = ret.sellerId ?? null;
  ret.message = ret.remarks ?? "";
  ret.actionType = ret.action ?? "none";

  if (!ret.adId && ret.propertyId) {
    ret.adId = ret.propertyId;
  }

  return ret;
}

const ReportSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      alias: "property",
    },
    // Keep the legacy duplicated path for collection compatibility.
    adId: { type: Schema.Types.ObjectId, ref: "Property", required: true },

    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      alias: "owner",
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      alias: "reporter",
    },

    reason: { type: String, enum: REPORT_REASONS, required: true, trim: true },
    remarks: { type: String, default: "", trim: true, alias: "message" },

    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    adminNote: { type: String, default: "", trim: true },
    action: {
      type: String,
      enum: REPORT_ACTION_TYPES,
      default: "none",
      alias: "actionType",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: attachAliases },
    toObject: { virtuals: true, transform: attachAliases },
  }
);

ReportSchema.index({ propertyId: 1, reporterId: 1 }, { unique: true });
ReportSchema.index({ adId: 1, reporterId: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

export type ReportDoc = InferSchemaType<typeof ReportSchema>;
const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

export default Report;
