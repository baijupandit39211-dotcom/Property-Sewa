import mongoose from "mongoose";
import { logger } from "../utils/logger";

export async function connectDB() {
  // ✅ keep ONE env name everywhere
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("❌ MONGODB_URI missing in .env");
  }

  try {
    await mongoose.connect(uri);
    logger.info("✅ MongoDB connected");
  } catch (error: any) {
    logger.error("❌ MongoDB connection failed:", error?.message || error);
    process.exit(1);
  }
}
