import { Router } from "express";
import { requireAdminAuth } from "../../auth/middleware/auth.middleware";
import { requireAdminRole } from "../../../middleware/role.middleware";
import * as adminOverviewController from "../controllers/adminOverview.controller";

const router = Router();

router.get("/", requireAdminAuth, requireAdminRole, adminOverviewController.getOverview);

export default router;
