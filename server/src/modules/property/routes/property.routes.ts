import { Router } from "express";
import { requireUserAuth, requireAdminAuth } from "../../auth/middleware/auth.middleware";
import { requireAdminRole } from "../../../middleware/role.middleware";
import { upload } from "../../../middleware/upload.middleware";
import * as propertyController from "../controllers/property.controller";

const router = Router();

// buyer/public: approved listings
router.get("/", propertyController.listApproved);

// ✅ seller: get my properties (MUST be before "/:id")
router.get("/mine", requireUserAuth, propertyController.getMyProperties);

// ✅ seller: get my property by id (MUST be before "/:id")
router.get("/mine/:id", requireUserAuth, propertyController.getMyPropertyById);

// buyer/public: approved listing by id
router.get("/:id", propertyController.getApprovedById);

// seller/agent: create with images
router.post("/", requireUserAuth, upload.array("images", 6), propertyController.createProperty);

// seller: delete own property
router.delete("/:id", requireUserAuth, propertyController.deleteProperty);

// seller: edit own property
router.patch("/:id", requireUserAuth, upload.array("images", 6), propertyController.updateProperty);

// admin: pending + approve/reject (uses adminToken)
router.get("/admin/pending", requireAdminAuth, requireAdminRole, propertyController.listPending);
router.patch("/admin/:id/approve", requireAdminAuth, requireAdminRole, propertyController.approve);
router.patch("/admin/:id/reject", requireAdminAuth, requireAdminRole, propertyController.reject);

export default router;
