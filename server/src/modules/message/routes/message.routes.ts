import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import { chatUpload } from "../../../middleware/upload.middleware";
import * as messageController from "../controllers/message.controller";

const router = Router();

// GET /messages/:leadId (requireUserAuth)
router.get("/unread-count", requireUserAuth, messageController.getUnreadCount);
router.get("/:leadId/suggestions", requireUserAuth, messageController.getSellerReplySuggestions);
router.get("/:leadId", requireUserAuth, messageController.getMessagesByLead);

// POST /messages/:leadId (requireUserAuth)
router.post("/:leadId", requireUserAuth, chatUpload.single("file"), messageController.createMessage);
router.delete("/:leadId/:messageId", requireUserAuth, messageController.deleteMessage);

export default router;
