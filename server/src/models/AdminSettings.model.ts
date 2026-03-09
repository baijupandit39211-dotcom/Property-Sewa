import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AdminSettingsSchema = new Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: "primary",
    },
    platform: {
      platformName: { type: String, default: "Property Sewa" },
      supportEmail: { type: String, default: "support@propertysewa.com" },
      supportPhone: { type: String, default: "" },
      supportAddress: { type: String, default: "" },
      contactHours: { type: String, default: "Sun - Fri, 9:00 AM - 6:00 PM" },
      defaultCurrency: { type: String, default: "NPR" },
      defaultLocale: { type: String, default: "en-NP" },
      homepageHeadline: {
        type: String,
        default: "Find verified homes, rooms, and land across Nepal.",
      },
    },
    operations: {
      featuredListingFee: { type: Number, default: 0 },
      reportReviewSlaHours: { type: Number, default: 24 },
      newListingReviewRequired: { type: Boolean, default: true },
      allowBuyerReporting: { type: Boolean, default: true },
      allowGoogleLogin: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },
    notifications: {
      emailOnNewReport: { type: Boolean, default: true },
      emailOnNewListing: { type: Boolean, default: true },
      emailOnNewUser: { type: Boolean, default: false },
      dailyDigest: { type: Boolean, default: true },
      digestHour: { type: Number, default: 9 },
      productAnnouncements: { type: Boolean, default: false },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

AdminSettingsSchema.index({ singletonKey: 1 }, { unique: true });

export type AdminSettingsDoc = InferSchemaType<typeof AdminSettingsSchema>;

const AdminSettings =
  mongoose.models.AdminSettings ||
  mongoose.model("AdminSettings", AdminSettingsSchema);

export default AdminSettings;
