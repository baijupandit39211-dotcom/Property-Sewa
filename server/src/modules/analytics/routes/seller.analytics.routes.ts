import { Router } from "express";
import * as analyticsController from "../controllers/seller.analytics.controller";

const router = Router();

// GET /analytics/seller (already)
router.get("/seller", ...analyticsController.getSellerAnalyticsWithAuth);

// ✅ NEW: GET /analytics/seller/pdf
router.get("/seller/pdf", ...analyticsController.getSellerAnalyticsPdfWithAuth);

export default router;
