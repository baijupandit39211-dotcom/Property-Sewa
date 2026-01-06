//apps/api/src/modules/users/user.service.js
const bcrypt = require("bcryptjs");
const User = require("./user.model");

const createUser = async (userData) => {
	if (userData.password) {
		userData.password = await bcrypt.hash(userData.password, 10);
	}
	const user = await User.create(userData);
	return user;
};

const getAllUsers = async () => {
	return User.find().select("-password");
};

const getUserById = async (userId) => {
	return User.findById(userId).select("-password");
};

const updateUserById = async (userId, updateData) => {
	if (updateData.password) {
		updateData.password = await bcrypt.hash(updateData.password, 10);
	}
	return User.findByIdAndUpdate(userId, updateData, { new: true }).select(
		"-password",
	);
};

const deleteUserById = async (userId) => {
	return User.findByIdAndDelete(userId);
};

const updateUserRole = async (userId, role) => {
	if (!role) throw new Error("role is required");
	const allowed = ["buyer", "seller", "agent", "admin", "superadmin"];
	if (!allowed.includes(role)) throw new Error("Invalid role");

	const user = await User.findByIdAndUpdate(
		userId,
		{ role },
		{ new: true },
	).select("-password");
	if (!user) throw new Error("User not found");
	return user;
};

module.exports = {
	createUser,
	getAllUsers,
	getUserById,
	updateUserById,
	deleteUserById,
	updateUserRole,
};
