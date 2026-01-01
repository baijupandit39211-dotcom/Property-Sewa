//apps/api/src/modules/auth/auth.controller.js
const authService = require("./auth.service");

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: Number(process.env.COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
});

const setAuthCookie = (res, token) => {
  const cookieName = process.env.COOKIE_NAME || "accessToken";
  res.cookie(cookieName, token, getCookieOptions());
};

// POST /auth/register
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    setAuthCookie(res, result.token);
    return res.status(201).json({ user: result.user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    setAuthCookie(res, result.token);
    return res.status(200).json({ user: result.user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// ✅ POST /auth/google
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    const result = await authService.googleLogin({ credential });
    setAuthCookie(res, result.token);
    return res.status(200).json({ user: result.user });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  const cookieName = process.env.COOKIE_NAME || "accessToken";

  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({ message: "Logged out successfully" });
};

// GET /auth/me
const me = async (req, res) => {
  try {
    const User = require("../users/user.model");
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /auth/me
const updateMe = async (req, res) => {
  try {
    const updatedUser = await authService.updateMe(req.user.userId, req.body);
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// PATCH /auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// POST /auth/init-superadmin
const initSuperAdmin = async (req, res) => {
  try {
    const admin = await authService.initSuperAdmin(req.body);
    return res.status(201).json(admin);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  googleLogin, // ✅ important export
  logout,
  me,
  updateMe,
  changePassword,
  initSuperAdmin,
};
