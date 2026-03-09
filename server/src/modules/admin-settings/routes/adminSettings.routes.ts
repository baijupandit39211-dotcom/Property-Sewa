import { Router } from "express";
import { requireAdminAuth } from "../../auth/middleware/auth.middleware";
import { requireAdminRole } from "../../../middleware/role.middleware";
import * as adminSettingsController from "../controllers/adminSettings.controller";

const router = Router();

router.get("/", requireAdminAuth, requireAdminRole, adminSettingsController.getSettings);
router.patch(
  "/profile",
  requireAdminAuth,
  requireAdminRole,
  adminSettingsController.updateProfile
);
router.patch(
  "/platform",
  requireAdminAuth,
  requireAdminRole,
  adminSettingsController.updatePlatform
);
router.patch(
  "/notifications",
  requireAdminAuth,
  requireAdminRole,
  adminSettingsController.updateNotifications
);

export default router;
