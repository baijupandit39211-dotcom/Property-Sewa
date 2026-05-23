import { Router } from "express";
import { requireUserAuth, requireAdminAuth } from "../../auth/middleware/auth.middleware";
import {
  createFeedback,
  getAdminFeedback,
  getMyFeedback,
  updateFeedbackStatus,
} from "../controllers/feedback.controller";

const router = Router();

router.post("/", requireUserAuth, createFeedback);
router.get("/mine", requireUserAuth, getMyFeedback);

export const adminFeedbackRouter = Router();
adminFeedbackRouter.get("/", requireAdminAuth, getAdminFeedback);
adminFeedbackRouter.patch("/:id/status", requireAdminAuth, updateFeedbackStatus);

export default router;