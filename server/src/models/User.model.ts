import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },

    avatar: { type: String, default: "" },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    role: {
      type: String,
      enum: ["buyer", "seller", "agent", "admin", "superadmin"],
      default: "buyer",
    },

    passwordHash: { type: String, default: "" },
    googleId: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },

    // ✅ NEW: reset password fields
    resetPasswordTokenHash: { type: String, default: "" },
    resetPasswordExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
