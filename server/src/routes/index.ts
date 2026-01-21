import { Router } from "express";

import authRoutes from "../modules/auth/routes/auth.routes";
import initSuperAdminRoutes from "../modules/auth/routes/init-superadmin.routes";
import propertyRoutes from "../modules/property/routes/property.routes";
import leadRoutes from "../modules/lead/routes/lead.routes";
import messageRoutes from "../modules/message/routes/message.routes";
import visitRoutes from "../modules/visit/routes/visit.routes";

const router = Router();

router.get("/health", (_req, res) => res.send("OK"));

router.use("/auth", authRoutes);
router.use("/auth", initSuperAdminRoutes);

// ✅ Properties
router.use("/properties", propertyRoutes);

// ✅ Leads
router.use("/leads", leadRoutes);

// ✅ Messages
router.use("/messages", messageRoutes);

// ✅ Visits
router.use("/visits", visitRoutes);

export default router;
