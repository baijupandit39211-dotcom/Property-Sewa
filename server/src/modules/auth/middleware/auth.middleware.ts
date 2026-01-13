import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";

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

/** ✅ User auth (buyer/seller/agent) uses accessToken only */
export function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    const token = req.cookies?.[cookieName];

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const decoded = verify(token);

    req.user = {
      userId: String(decoded.userId),
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/** ✅ Admin auth uses adminToken only */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const adminCookie = process.env.ADMIN_COOKIE_NAME || "adminToken";
    const token = req.cookies?.[adminCookie];

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin authentication required" });
    }

    const decoded = verify(token);

    req.user = {
      userId: String(decoded.userId),
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
  }
}
