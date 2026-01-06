//apps/api/src/modules/users/user.model.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },

		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},

		// local users have password, google users may not
		password: { type: String },

		address: { type: String, default: "", trim: true },
		phone: { type: String, default: "", trim: true },

		role: {
			type: String,
			enum: ["buyer", "seller", "agent", "admin", "superadmin"],
			default: "buyer",
		},

		provider: {
			type: String,
			enum: ["local", "google"],
			default: "local",
		},

		googleId: { type: String, default: "" },
		avatar: { type: String, default: "" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
