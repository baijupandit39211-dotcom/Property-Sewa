import type { Request, Response, NextFunction } from "express";
import authService from "../services/auth.services";
import { sendWelcomeEmail } from "../../../services/email.service";

/**
 * Cookie options for SETTING cookies
 */
const getCookieOptions = () => {
  const options = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: false, // false for localhost
    maxAge: Number(process.env.COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  return options;
};

/**
 * Cookie options for CLEARING cookies (NO maxAge)
 * ✅ Fixes Express deprecation warning
 */
const getClearCookieOptions = () => {
  const options = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  return options;
};

function setCookie(res: Response, cookieName: string, token: string) {
  res.cookie(cookieName, token, getCookieOptions());
}

/**
 * =========================
 * AUTH CONTROLLERS
 * =========================
 */

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);

    // ✅ Normal users always get accessToken
    const cookieName = process.env.COOKIE_NAME || "accessToken";
    setCookie(res, cookieName, result.token);

    // ✅ Send welcome email (NON-blocking)
    sendWelcomeEmail({
      to: result.user.email,
      name: result.user.name,
      dashboardUrl:
        process.env.APP_DASHBOARD_URL || "http://localhost:3000/dashboard",
    }).catch((err) => {
      console.error("Welcome email failed:", err?.message || err);
    });

    return res.status(201).json({ success: true, user: result.user });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);

    const cookieName = process.env.COOKIE_NAME || "accessToken";
    setCookie(res, cookieName, result.token);

    return res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    return next(err);
  }
}

/**
 * ✅ Admin login → adminToken ONLY
 */
export async function adminLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
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

export async function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await authService.googleLogin(req.body);

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

    // ✅ Fixed: no maxAge when clearing cookies
    res.clearCookie(userCookie, getClearCookieOptions());
    res.clearCookie(adminCookie, getClearCookieOptions());

    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
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

export async function adminMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId as string;
    const user = await authService.getMe(userId);
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId as string;
    const result = await authService.changePassword(userId, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function initSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const admin = await authService.initSuperAdmin(req.body);
    return res.status(201).json({ success: true, admin });
  } catch (err) {
    return next(err);
  }
}
