import { Router } from "express";
import { requireUserAuth, requireAdminAuth } from "../../auth/middleware/auth.middleware";
import { requireAdminRole } from "../../../middleware/role.middleware";
import { upload } from "../../../middleware/upload.middleware";
import * as propertyController from "../controllers/property.controller";

const router = Router();

// buyer: approved listings
router.get("/", propertyController.listApproved);
router.get("/:id", propertyController.getApprovedById);

// seller/agent: create with images
router.post("/", requireUserAuth, upload.array("images", 6), propertyController.createProperty);

// admin: pending + approve/reject (uses adminToken)
router.get("/admin/pending", requireAdminAuth, requireAdminRole, propertyController.listPending);
router.patch("/admin/:id/approve", requireAdminAuth, requireAdminRole, propertyController.approve);
router.patch("/admin/:id/reject", requireAdminAuth, requireAdminRole, propertyController.reject);

export default router;
