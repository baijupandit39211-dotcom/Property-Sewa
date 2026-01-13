import { Router } from "express";
import * as authController from "../controllers/auth.controller";

const router = Router();

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
router.post("/init-superadmin", authController.initSuperAdmin);

export default router;
