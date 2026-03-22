import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.get("/", requireUserAuth, notificationController.getUserNotifications);
router.get("/unread-count", requireUserAuth, notificationController.getUnreadCount);
router.patch("/read-all", requireUserAuth, notificationController.markAllAsRead);
router.patch("/:id/read", requireUserAuth, notificationController.markAsRead);

export default router;
