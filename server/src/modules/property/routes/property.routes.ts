import { Router } from "express";
import { requireUserAuth, requireAdminAuth } from "../../auth/middleware/auth.middleware";
import { requireAdminRole } from "../../../middleware/role.middleware";
import { upload } from "../../../middleware/upload.middleware";
import * as propertyController from "../controllers/property.controller";

const router = Router();

// buyer/public: approved listings
router.get("/", propertyController.listApproved);

// seller: get my properties (MUST be before "/:id")
router.get("/mine", requireUserAuth, propertyController.getMyProperties);

// seller: get my property by id (MUST be before "/:id")
router.get("/mine/:id", requireUserAuth, propertyController.getMyPropertyById);

// ✅ PREVIEW route (seller can view pending in buyer-style page if needed)
router.get("/preview/:id", requireUserAuth, propertyController.previewById);

// ✅ admin routes MUST be before "/:id"
router.get("/admin/all", requireAdminAuth, requireAdminRole, propertyController.listAllForAdmin);
router.get("/admin/pending", requireAdminAuth, requireAdminRole, propertyController.listPending);
router.patch("/admin/:id/approve", requireAdminAuth, requireAdminRole, propertyController.approve);
router.patch("/admin/:id/reject", requireAdminAuth, requireAdminRole, propertyController.reject);
router.patch("/admin/:id/status", requireAdminAuth, requireAdminRole, propertyController.adminUpdateStatus);
router.delete("/admin/:id", requireAdminAuth, requireAdminRole, propertyController.adminDelete);

// seller/agent: create with images
router.post("/", requireUserAuth, upload.array("images", 6), propertyController.createProperty);

// seller: edit own property
router.patch("/:id", requireUserAuth, upload.array("images", 6), propertyController.updateProperty);

// seller: delete own property
router.delete("/:id", requireUserAuth, propertyController.deleteProperty);

// buyer/public: approved listing by id (KEEP LAST)
router.get("/:id", propertyController.getApprovedById);

export default router;
