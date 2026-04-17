import { Router } from "express";
import { requireAdminAuth } from "../../auth/middleware/auth.middleware";
import {
  generateContactReplySuggestion,
  getContactMessages,
  replyToContactMessage,
  updateContactMessageStatus,
} from "../controllers/contact.controller";

const router = Router();

router.use(requireAdminAuth);
router.get("/", getContactMessages);
router.patch("/:contactId/status", updateContactMessageStatus);
router.post("/:contactId/reply", replyToContactMessage);
router.post("/:contactId/ai-reply", generateContactReplySuggestion);

export default router;
