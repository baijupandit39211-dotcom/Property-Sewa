import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import User from "../../../models/User.model";

type JwtPayloadShape = JwtPayload & {
  userId: string;
  email?: string;
  role?: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET as Secret;
  if (!secret) throw new Error("JWT_SECRET not set");
  return secret;
}

function verify(token: string) {
  return jwt.verify(token, getSecret()) as JwtPayloadShape;
}

async function readAuthenticatedUser(token: string | undefined) {
  if (!token) return { user: null as null, blocked: null as null | "suspended" | "archived" };

  const decoded = verify(token);
  const user = await User.findById(decoded.userId).select("_id email role status").lean();
  if (!user) return { user: null as null, blocked: null as null | "suspended" | "archived" };

  const status = String(user.status || "active").toLowerCase();
  if (status === "suspended" || status === "inactive" || status === "archived") {
    return {
      user: null as null,
      blocked: status === "suspended" ? "suspended" : "archived",
    };
  }

  return {
    user: {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    blocked: null as null | "suspended" | "archived",
  };
}

/** ✅ User auth (buyer/seller/agent) uses accessToken only */
export async function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    const token = req.cookies?.[cookieName];

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const auth = await readAuthenticatedUser(token);
    if (auth.blocked === "suspended") {
      return res.status(403).json({ success: false, message: "Your account is suspended" });
    }
    if (auth.blocked === "archived") {
      return res.status(403).json({ success: false, message: "Your account is archived" });
    }
    if (!auth.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    req.user = auth.user;

    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/** ✅ Admin auth uses adminToken only */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const adminCookie = process.env.ADMIN_COOKIE_NAME || "adminToken";
    const token = req.cookies?.[adminCookie];

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin authentication required" });
    }

    const auth = await readAuthenticatedUser(token);
    if (auth.blocked === "suspended") {
      return res.status(403).json({ success: false, message: "Your account is suspended" });
    }
    if (auth.blocked === "archived") {
      return res.status(403).json({ success: false, message: "Your account is archived" });
    }
    if (!auth.user) {
      return res.status(401).json({ success: false, message: "Admin authentication required" });
    }
    const role = String(auth.user.role || "").toLowerCase();
    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Admin access denied" });
    }
    req.user = auth.user;

    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    const adminCookie = process.env.ADMIN_COOKIE_NAME || "adminToken";
    const token = req.cookies?.[cookieName];
    const adminToken = req.cookies?.[adminCookie];

    const auth = await readAuthenticatedUser(token);
    const adminAuth = auth.user ? null : await readAuthenticatedUser(adminToken);
    const user = auth.user || adminAuth?.user;
    if (user) req.user = user;
  } catch {
    // Public route: ignore invalid or missing credentials and continue as anonymous.
  }

  return next();
}
