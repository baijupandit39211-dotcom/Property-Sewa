import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import User from "../../../models/User.model";

const router = Router();

async function guardSuperAdminBootstrap(req: any, res: any, next: any) {
  try {
    const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
    const allowBootstrap =
      String(process.env.ALLOW_SUPERADMIN_BOOTSTRAP || "").trim().toLowerCase() === "true";

    if (isProd && !allowBootstrap) {
      return res.status(403).json({
        success: false,
        message: "Superadmin bootstrap is disabled in production.",
      });
    }

    const existing = await User.exists({ role: "superadmin" });
    if (existing) {
      return res.status(400).json({ success: false, message: "Super admin already initialized" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * @swagger
 * tags:
 *   - name: SuperAdmin
 *     description: Superadmin initialization
 */

/**
 * @swagger
 * /auth/init-superadmin:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Create superadmin (only once)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "admin@system.com" }
 *               password: { type: string, example: "admin123" }
 *     responses:
 *       201: { description: Superadmin created }
 *       400: { description: Already initialized }
 */
router.post("/init-superadmin", guardSuperAdminBootstrap, authController.initSuperAdmin);

export default router;
