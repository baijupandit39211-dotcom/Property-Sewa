import { Router } from "express";

import authRoutes from "../modules/auth/routes/auth.routes";
import initSuperAdminRoutes from "../modules/auth/routes/init-superadmin.routes";
import propertyRoutes from "../modules/property/routes/property.routes";

const router = Router();

router.get("/health", (_req, res) => res.send("OK"));

router.use("/auth", authRoutes);
router.use("/auth", initSuperAdminRoutes);

// ✅ Properties
router.use("/properties", propertyRoutes);

export default router;
