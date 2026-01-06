//apps/api/src/middleware/superadmin.middleware.js
const requireSuperAdmin = (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ message: "Not authenticated" });
	}

	if (req.user.role !== "superadmin") {
		return res.status(403).json({ message: "Superadmin only" });
	}

	next();
};

module.exports = { requireSuperAdmin };
