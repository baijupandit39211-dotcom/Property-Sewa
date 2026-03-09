import { Router } from "express";
import { requireAdminRole } from "../../middleware/role.middleware";
import { requireAdminAuth, requireUserAuth } from "../auth/middleware/auth.middleware";
import * as reportController from "./report.controller";

const router = Router();
const adminRouter = Router();

router.post("/", requireUserAuth, reportController.createReport);

router.get("/", requireAdminAuth, requireAdminRole, reportController.listReports);
router.get("/stats", requireAdminAuth, requireAdminRole, reportController.getReportStats);
router.get("/admin", requireAdminAuth, requireAdminRole, reportController.listReports);
router.get("/admin/stats", requireAdminAuth, requireAdminRole, reportController.getReportStats);
router.get("/admin/:id", requireAdminAuth, requireAdminRole, reportController.getReportById);
router.patch(
  "/admin/:id/remove-property",
  requireAdminAuth,
  requireAdminRole,
  reportController.removePropertyFromReport
);
router.patch(
  "/admin/:id/restore-property",
  requireAdminAuth,
  requireAdminRole,
  reportController.restorePropertyFromReport
);
router.patch("/admin/:id", requireAdminAuth, requireAdminRole, reportController.updateReport);
router.get("/:id", requireAdminAuth, requireAdminRole, reportController.getReportById);
router.patch(
  "/:id/remove-property",
  requireAdminAuth,
  requireAdminRole,
  reportController.removePropertyFromReport
);
router.patch(
  "/:id/restore-property",
  requireAdminAuth,
  requireAdminRole,
  reportController.restorePropertyFromReport
);
router.patch("/:id", requireAdminAuth, requireAdminRole, reportController.updateReport);

adminRouter.get("/", requireAdminAuth, requireAdminRole, reportController.listReports);
adminRouter.get("/stats", requireAdminAuth, requireAdminRole, reportController.getReportStats);
adminRouter.get("/:id", requireAdminAuth, requireAdminRole, reportController.getReportById);
adminRouter.patch(
  "/:id/remove-property",
  requireAdminAuth,
  requireAdminRole,
  reportController.removePropertyFromReport
);
adminRouter.patch(
  "/:id/restore-property",
  requireAdminAuth,
  requireAdminRole,
  reportController.restorePropertyFromReport
);
adminRouter.patch("/:id", requireAdminAuth, requireAdminRole, reportController.updateReport);

export { adminRouter };
export default router;
