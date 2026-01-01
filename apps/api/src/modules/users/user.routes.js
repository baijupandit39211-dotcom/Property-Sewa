//apps/api/src/modules/users/user.routes.js
const express = require("express");
const router = express.Router();

const userController = require("./user.controller");
const { requireAuth } = require("../../middleware/auth.middleware");
const { requireSuperAdmin } = require("../../middleware/superadmin.middleware");

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Users CRUD APIs (Superadmin Only)
 */

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user (superadmin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
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
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *               address:
 *                 type: string
 *                 example: Kathmandu
 *     responses:
 *       201:
 *         description: User created
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Superadmin only
 */
router.post("/", requireAuth, requireSuperAdmin, userController.createUser);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users (superadmin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Superadmin only
 */
router.get("/", requireAuth, requireSuperAdmin, userController.getAllUsers);

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     summary: Update a user's role (superadmin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6948274c4cca0313e0822f70
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 example: superadmin
 *     responses:
 *       200:
 *         description: Role updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Superadmin only
 */
router.patch("/:id/role", requireAuth, requireSuperAdmin, userController.updateUserRole);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get a user by id (superadmin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6948274c4cca0313e0822f70
 *     responses:
 *       200:
 *         description: User found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Superadmin only
 *       404:
 *         description: User not found
 */
router.get("/:id", requireAuth, requireSuperAdmin, userController.getUserById);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a user by id (superadmin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6948274c4cca0313e0822f70
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
 *         description: User updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Superadmin only
 *       404:
 *         description: User not found
 */
router.put("/:id", requireAuth, requireSuperAdmin, userController.updateUserById);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user by id (superadmin only)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 6948274c4cca0313e0822f70
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Superadmin only
 *       404:
 *         description: User not found
 */
router.delete("/:id", requireAuth, requireSuperAdmin, userController.deleteUserById);

module.exports = router;
