//apps/api/src/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  try {
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { requireAuth };
