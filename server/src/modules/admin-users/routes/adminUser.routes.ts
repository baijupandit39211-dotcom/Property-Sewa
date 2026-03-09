import { Router } from "express";
import { requireAdminAuth } from "../../auth/middleware/auth.middleware";
import { requireRoles } from "../../../middleware/role.middleware";
import * as adminUserController from "../controllers/adminUser.controller";

const router = Router();

// GET /admin/users?search&role&status&page&limit
router.get("/", requireAdminAuth, requireRoles(["admin", "superadmin"]), adminUserController.listUsers);

// GET /admin/users/:id
router.get("/:id", requireAdminAuth, requireRoles(["admin", "superadmin"]), adminUserController.getUser);

// PATCH /admin/users/:id
router.patch(
  "/:id",
  requireAdminAuth,
  requireRoles(["admin", "superadmin"]),
  adminUserController.updateUser
);

// PATCH /admin/users/:id/status
router.patch(
  "/:id/status",
  requireAdminAuth,
  requireRoles(["admin", "superadmin"]),
  adminUserController.updateStatus
);

// PATCH /admin/users/:id/role (superadmin only)
router.patch(
  "/:id/role",
  requireAdminAuth,
  requireRoles(["superadmin"]),
  adminUserController.updateRole
);

export default router;
