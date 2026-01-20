import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

import User from "../../../models/User.model";
import { ApiError } from "../../../utils/apiError";
import type { RegisterInput, LoginInput } from "../types/auth.types";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user: any) {
  const secret = process.env.JWT_SECRET as Secret;
  if (!secret) throw new ApiError(500, "JWT_SECRET missing in .env");

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    secret,
    options
  );
}

function safeUser(u: any) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    address: u.address,
    phone: u.phone,
    role: u.role,
    provider: u.provider,
    avatar: u.avatar,
    createdAt: u.createdAt,
  };
}

async function register({ name, email, password, address, phone, role }: RegisterInput) {
  if (!name || !email || !password) {
    throw new ApiError(400, "name, email, password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(400, "Email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    passwordHash: hashedPassword,
    address: address || "",
    phone: phone || "",
    role: role || "buyer",
    provider: "local",
  });

  return { token: signToken(user), user: safeUser(user) };
}

async function login({ email, password }: LoginInput) {
  if (!email || !password) throw new ApiError(400, "email and password are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(400, "Invalid email or password");

  if (user.provider === "google") {
    throw new ApiError(400, "This account uses Google login. Please sign in with Google.");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash || "");
  if (!isMatch) throw new ApiError(400, "Invalid email or password");

  return { token: signToken(user), user: safeUser(user) };
}

async function googleLogin(input: any) {
  const credential = input?.credential;
  const role = input?.role || "buyer"; // Accept role from client, default to buyer
  
  // Validate role - never allow admin roles from client in Google signup
  const allowedRoles = ["buyer", "seller", "agent"];
  const validRole = allowedRoles.includes(role) ? role : "buyer";
  
  if (!credential) throw new ApiError(400, "credential is required");
  if (!process.env.GOOGLE_CLIENT_ID) throw new ApiError(400, "GOOGLE_CLIENT_ID missing in .env");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new ApiError(400, "Invalid Google token");

  const googleId = payload.sub || "";
  const email = payload.email || "";
  const name = payload.name || "Google User";
  const avatar = payload.picture || "";

  if (!email) throw new ApiError(400, "Google account has no email");

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: "",
      address: "",
      phone: "",
      role: validRole, // Use validated role for new users
      provider: "google",
      googleId,
      avatar,
    });
  } else {
    // For existing users, update role if valid role provided and current role is buyer
    if (user.role === "buyer" && validRole !== "buyer") {
      user.role = validRole;
    }
    if (!user.googleId) user.googleId = googleId;
    if (!user.avatar && avatar) user.avatar = avatar;
    await user.save();
  }

  return { token: signToken(user), user: safeUser(user) };
}

async function getMe(userId: string) {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

async function changePassword(userId: string, body: any) {
  const { currentPassword, newPassword } = body || {};
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "currentPassword and newPassword are required");
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (user.provider === "google") {
    throw new ApiError(400, "Google accounts cannot change password here.");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || "");
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return { message: "Password changed successfully" };
}

async function initSuperAdmin(input: any) {
  const email = input?.email;
  const password = input?.password;

  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const existingAdmin = await User.findOne({ role: "superadmin" });
  if (existingAdmin) throw new ApiError(400, "Super admin already initialized");

  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new ApiError(400, "Email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await User.create({
    name: "Super Admin",
    email,
    passwordHash: hashedPassword,
    address: "",
    phone: "",
    role: "superadmin",
    provider: "local",
    avatar: "",
    googleId: "",
  });

  return safeUser(admin);
}

export default {
  register,
  login,
  googleLogin,
  getMe,
  changePassword,
  initSuperAdmin,
};
