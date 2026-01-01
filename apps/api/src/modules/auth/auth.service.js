//apps/api/src/modules/auth/auth.service.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../users/user.model");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const safeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  address: u.address,
  phone: u.phone,
  role: u.role,
  provider: u.provider,
  avatar: u.avatar,
  createdAt: u.createdAt,
});

// REGISTER (local)
const register = async ({ name, email, password, address, phone, role }) => {
  if (!name || !email || !password) {
    throw new Error("name, email, password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) throw new Error("Email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  // allow only these roles from frontend
  const allowedRoles = ["buyer", "seller", "agent", "admin"];
  const finalRole = role && allowedRoles.includes(role) ? role : "buyer";

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    address: address || "",
    phone: phone || "",
    role: finalRole,
    provider: "local",
  });

  return { token: signToken(user), user: safeUser(user) };
};

// LOGIN (local)
const login = async ({ email, password }) => {
  if (!email || !password) throw new Error("email and password are required");

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");

  if (user.provider === "google") {
    throw new Error("This account uses Google login. Please sign in with Google.");
  }

  const isMatch = await bcrypt.compare(password, user.password || "");
  if (!isMatch) throw new Error("Invalid email or password");

  return { token: signToken(user), user: safeUser(user) };
};

// ✅ GOOGLE LOGIN
const googleLogin = async ({ credential }) => {
  if (!credential) throw new Error("credential is required");
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID missing in .env");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token");

  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || "Google User";
  const avatar = payload.picture || "";

  if (!email) throw new Error("Google account has no email");

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: undefined,
      address: "",
      phone: "",
      role: "buyer",
      provider: "google",
      googleId,
      avatar,
    });
  } else {
    // link google fields if missing
    if (!user.googleId) user.googleId = googleId;
    if (!user.avatar && avatar) user.avatar = avatar;
    await user.save();
  }

  return { token: signToken(user), user: safeUser(user) };
};

// UPDATE ME
const updateMe = async (userId, updateData) => {
  if (updateData.password) throw new Error("Use change password API to update password");

  // protect sensitive fields
  delete updateData.role;
  delete updateData.provider;
  delete updateData.googleId;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  }).select("-password");

  return user;
};

// CHANGE PASSWORD
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    throw new Error("currentPassword and newPassword are required");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.provider === "google") {
    throw new Error("Google accounts cannot change password here.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password || "");
  if (!isMatch) throw new Error("Current password is incorrect");

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return { message: "Password changed successfully" };
};

// INIT SUPERADMIN
const initSuperAdmin = async ({ name, email, password, address }) => {
  if (!name || !email || !password || !address) {
    throw new Error("name, email, password, address are required");
  }

  const existingAdmin = await User.findOne({ role: "superadmin" });
  if (existingAdmin) throw new Error("Super admin already initialized");

  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new Error("Email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await User.create({
    name,
    email,
    password: hashedPassword,
    address,
    role: "superadmin",
    provider: "local",
  });

  return safeUser(admin);
};

module.exports = {
  register,
  login,
  googleLogin,
  updateMe,
  changePassword,
  initSuperAdmin,
};
