import { Router } from "express";

import authRoutes from "../modules/auth/routes/auth.routes";
import initSuperAdminRoutes from "../modules/auth/routes/init-superadmin.routes";
import propertyRoutes from "../modules/property/routes/property.routes";
import leadRoutes from "../modules/lead/routes/lead.routes";
import messageRoutes from "../modules/message/routes/message.routes";
import visitRoutes from "../modules/visit/routes/visit.routes";
import sellerAnalyticsRoutes from "../modules/analytics/routes/seller.analytics.routes";

// ✅ Payments
import paymentRoutes from "../modules/payments/routes/payment.routes";

const router = Router();

router.get("/health", (_req, res) => res.send("OK"));

router.use("/auth", authRoutes);
router.use("/auth", initSuperAdminRoutes);

// Properties
router.use("/properties", propertyRoutes);

// Leads
router.use("/leads", leadRoutes);

// Messages
router.use("/messages", messageRoutes);

// Visits
router.use("/visits", visitRoutes);

// Analytics
router.use("/analytics", sellerAnalyticsRoutes);

// Payments
router.use("/payments", paymentRoutes);

export default router;
