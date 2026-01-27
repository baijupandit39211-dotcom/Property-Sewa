import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireUserAuth, requireAdminAuth } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 */

/**
 * =========================
 * Public Auth
 * =========================
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "John Doe" }
 *               email: { type: string, example: "john@mail.com" }
 *               password: { type: string, example: "Pass@1234" }
 *               phone: { type: string, example: "9800000000" }
 *               address: { type: string, example: "Kathmandu" }
 *               role: { type: string, example: "buyer" }
 *     responses:
 *       201: { description: Registered successfully }
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login a user (Buyer/Seller/Agent)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "john@mail.com" }
 *               password: { type: string, example: "Pass@1234" }
 *     responses:
 *       200: { description: Logged in successfully }
 *       400: { description: Invalid email or password }
 */
router.post("/login", authController.login);

/**
 * ✅ Admin login (sets adminToken cookie)
 *
 * @swagger
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login (Admin/SuperAdmin only)
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
 *       200: { description: Admin logged in successfully }
 *       403: { description: Access denied }
 */
router.post("/admin/login", authController.adminLogin);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Google login/signup (sets httpOnly cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *     responses:
 *       200: { description: Logged in successfully }
 *       400: { description: Invalid Google token }
 */
router.post("/google", authController.googleLogin);

/**
 * =========================
 * Session / Profile
 * =========================
 */

/**
 * ✅ Logout current user (clears accessToken + adminToken)
 *
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current user (clears accessToken + adminToken)
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post("/logout", authController.logout);

/**
 * ✅ Normal user ME (requires accessToken)
 *
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged in user (Buyer/Seller/Agent)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
router.get("/me", requireUserAuth, authController.me);

/**
 * ✅ Admin ME (requires adminToken)
 *
 * @swagger
 * /auth/admin/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged in admin
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: Current admin user }
 *       401: { description: Not authenticated }
 */
router.get("/admin/me", requireAdminAuth, authController.adminMe);

/**
 * =========================
 * Password Management
 * =========================
 */

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change password (Buyer/Seller/Agent)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Not authenticated }
 */
router.patch("/change-password", requireUserAuth, authController.changePassword);

/**
 * ✅ Forgot password (send reset link email)
 *
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send reset password email (does not reveal if email exists)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "john@mail.com" }
 *     responses:
 *       200: { description: OK }
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * ✅ Reset password (using token from email)
 *
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, example: "reset_token_from_email" }
 *               password: { type: string, example: "NewPass@1234" }
 *     responses:
 *       200: { description: Password updated }
 *       400: { description: Token invalid/expired }
 */
router.post("/reset-password", authController.resetPassword);

export default router;
