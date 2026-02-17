import { Router } from "express";
import { requireUserAuth } from "../../auth/middleware/auth.middleware";
import * as userController from "../controllers/user.controller";

const router = Router();

// GET current user (optional reuse) could be added later if needed
// PATCH /users/me
router.patch("/me", requireUserAuth, userController.updateMe);

export default router;
