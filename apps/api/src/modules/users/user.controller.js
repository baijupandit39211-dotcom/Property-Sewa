//apps/api/src/modules/users/user.controller.js
const userService = require("./user.service");

// CREATE: POST /users
const createUser = async (req, res) => {
	try {
		const user = await userService.createUser(req.body);
		res.status(201).json(user);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// READ ALL: GET /users
const getAllUsers = async (_req, res) => {
	try {
		const users = await userService.getAllUsers();
		res.status(200).json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// READ ONE: GET /users/:id
const getUserById = async (req, res) => {
	try {
		const user = await userService.getUserById(req.params.id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json(user);
	} catch (_error) {
		res.status(400).json({ message: "Invalid user id" });
	}
};

// UPDATE: PUT /users/:id
const updateUserById = async (req, res) => {
	try {
		const user = await userService.updateUserById(req.params.id, req.body);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json(user);
	} catch (_error) {
		res.status(400).json({ message: "Invalid user id" });
	}
};

// DELETE: DELETE /users/:id
const deleteUserById = async (req, res) => {
	try {
		const user = await userService.deleteUserById(req.params.id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({ message: "User deleted successfully" });
	} catch (_error) {
		res.status(400).json({ message: "Invalid user id" });
	}
};
// PATCH /users/:id/role  (superadmin only)
const updateUserRole = async (req, res) => {
	try {
		const { id } = req.params;
		const { role } = req.body;

		const updated = await userService.updateUserRole(id, role);

		return res.status(200).json(updated);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

module.exports = {
	createUser,
	getAllUsers,
	getUserById,
	updateUserById,
	deleteUserById,
	updateUserRole,
};
