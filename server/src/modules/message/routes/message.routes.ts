import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as messageController from "../controllers/message.controller";

const router = Router();

// GET /messages/:leadId (requireUserAuth)
router.get("/:leadId", requireUserAuth, messageController.getMessagesByLead);

// POST /messages/:leadId (requireUserAuth)
router.post("/:leadId", requireUserAuth, messageController.createMessage);

export default router;
