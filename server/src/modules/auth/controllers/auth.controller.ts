import type { Request, Response, NextFunction } from "express";
import authService from "../services/auth.services";

const getCookieOptions = () => ({
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: Number(process.env.COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
});

function setCookie(res: Response, cookieName: string, token: string) {
  res.cookie(cookieName, token, getCookieOptions());
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);

    // ✅ Normal users always get accessToken
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    setCookie(res, cookieName, result.token);

    return res.status(201).json({ success: true, user: result.user });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);

    // ✅ Normal login sets accessToken (buyer/seller/agent)
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    setCookie(res, cookieName, result.token);

    return res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    return next(err);
  }
}

/** ✅ Admin login sets adminToken cookie ONLY */
export async function adminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);

    const role = String(result.user?.role || "").toLowerCase();
    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const adminCookie = process.env.ADMIN_COOKIE_NAME || "adminToken";
    setCookie(res, adminCookie, result.token);

    return res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    return next(err);
  }
}

export async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.googleLogin(req.body);

    // ✅ Google is for normal users => accessToken
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    setCookie(res, cookieName, result.token);

    return res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    return next(err);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    const userCookie = process.env.COOKIE_NAME || "accessToken";
    const adminCookie = process.env.ADMIN_COOKIE_NAME || "adminToken";

    res.clearCookie(userCookie, getCookieOptions());
    res.clearCookie(adminCookie, getCookieOptions());

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    return next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    const user = await authService.getMe(userId);
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    const result = await authService.changePassword(userId, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function initSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await authService.initSuperAdmin(req.body);
    return res.status(201).json({ success: true, admin });
  } catch (err) {
    return next(err);
  }
}
