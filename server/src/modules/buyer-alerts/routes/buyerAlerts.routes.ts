import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import { requireRoles } from "../../../middleware/role.middleware";
import {
  createRule,
  deleteRule,
  getFeed,
  markAllRead,
  markItemRead,
  updatePreferences,
  updateRule,
} from "../controllers/buyerAlerts.controller";

const router = Router();

router.use(requireUserAuth);
router.use(requireRoles(["buyer"]));
router.get("/", getFeed);
router.put("/preferences", updatePreferences);
router.post("/rules", createRule);
router.patch("/rules/:id", updateRule);
router.delete("/rules/:id", deleteRule);
router.patch("/items/:id/read", markItemRead);
router.patch("/read-all", markAllRead);

export default router;
