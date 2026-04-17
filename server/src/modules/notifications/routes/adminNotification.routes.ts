import { Router } from "express";
import { requireAdminAuth } from "../../auth/middleware/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.get("/", requireAdminAuth, notificationController.getUserNotifications);
router.get("/unread-count", requireAdminAuth, notificationController.getUnreadCount);
router.patch("/read-all", requireAdminAuth, notificationController.markAllAsRead);
router.patch("/:id/read", requireAdminAuth, notificationController.markAsRead);

export default router;
