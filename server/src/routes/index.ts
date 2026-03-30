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
import reservationRoutes from "../modules/reservation/routes/reservation.routes";
import adminOverviewRoutes from "../modules/admin-overview/routes/adminOverview.routes";
import adminUserRoutes from "../modules/admin-users/routes/adminUser.routes";
import adminSettingsRoutes from "../modules/admin-settings/routes/adminSettings.routes";
import userRoutes from "../modules/users/routes/user.routes";
import reportRoutes, { adminRouter as adminReportRoutes } from "../modules/reports/report.routes";
import notificationRoutes from "../modules/notifications/routes/notification.routes";
import wishlistRoutes from "../modules/wishlist/routes/wishlist.routes";

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
router.use("/reservations", reservationRoutes);
router.use("/api/reservations", reservationRoutes); // alias for frontend /api prefix
router.use("/admin/overview", adminOverviewRoutes);
router.use("/api/admin/overview", adminOverviewRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/api/admin/users", adminUserRoutes); // alias with /api prefix
router.use("/admin/settings", adminSettingsRoutes);
router.use("/api/admin/settings", adminSettingsRoutes);
router.use("/users", userRoutes);
router.use("/api/users", userRoutes); // alias for frontend /api prefix
router.use("/reports", reportRoutes);
router.use("/api/reports", reportRoutes); // alias for frontend /api prefix
router.use("/api/admin/reports", adminReportRoutes); // admin reports
router.use("/admin/reports", adminReportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/wishlist", wishlistRoutes);

export default router;
