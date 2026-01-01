// apps/api/src/modules/auth/auth.routes.js
const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication APIs (cookie-based)
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user (sets cookie)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, address]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Test User
 *               email:
 *                 type: string
 *                 example: testuser1@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *               address:
 *                 type: string
 *                 example: Kathmandu
 *     responses:
 *       201:
 *         description: Registered successfully
 *       400:
 *         description: Validation error
 */
router.post("/register", authController.register);

/**
 * @openapi
 * /auth/init-superadmin:
 *   post:
 *     summary: Initialize Super Admin (one-time only)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, address]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Super Admin
 *               email:
 *                 type: string
 *                 example: admin@system.com
 *               password:
 *                 type: string
 *                 example: admin123
 *               address:
 *                 type: string
 *                 example: Kathmandu
 *     responses:
 *       201:
 *         description: Super admin created
 *       400:
 *         description: Already initialized or validation error
 */
router.post("/init-superadmin", authController.initSuperAdmin);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login (sets httpOnly cookie)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: testuser1@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Invalid email or password
 */
router.post("/login", authController.login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout (clears cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authController.logout);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     summary: Google login (verify Google ID token, then sets cookie)
 *     description: |
 *       Frontend sends Google ID token. Backend verifies token using google-auth-library.
 *       If user exists -> login. If not -> create user and login.
 *       Response sets httpOnly cookie like normal login.
 *     tags: [Auth]
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
 *                 description: Google ID token (credential) from Google Sign-In
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
 *     responses:
 *       200:
 *         description: Google login success (cookie set)
 *       400:
 *         description: Invalid token / missing credential
 */
router.post("/google", authController.googleLogin);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get logged-in user profile (cookie required)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Returns user profile
 *       401:
 *         description: Not authenticated
 */
router.get("/me", requireAuth, authController.me);

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     summary: Update logged-in user profile (cookie required)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Name
 *               address:
 *                 type: string
 *                 example: Pokhara
 *     responses:
 *       200:
 *         description: Updated successfully
 *       401:
 *         description: Not authenticated
 */
router.patch("/me", requireAuth, authController.updateMe);

/**
 * @openapi
 * /auth/change-password:
 *   patch:
 *     summary: Change password (cookie required)
 *     tags: [Auth]
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
 *               currentPassword:
 *                 type: string
 *                 example: 123456
 *               newPassword:
 *                 type: string
 *                 example: newpass123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect / validation error
 *       401:
 *         description: Not authenticated
 */
router.patch("/change-password", requireAuth, authController.changePassword);

module.exports = router;
