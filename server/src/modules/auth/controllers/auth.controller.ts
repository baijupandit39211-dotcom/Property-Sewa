import type { Request, Response, NextFunction } from "express";
import authService from "../services/auth.services";
import { sendWelcomeEmail, sendResetPasswordEmail } from "../../../services/email.service";

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

    const cookieName = process.env.COOKIE_NAME || "accessToken";
    setCookie(res, cookieName, result.token);

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

    res.clearCookie(userCookie, getClearCookieOptions());
    res.clearCookie(adminCookie, getClearCookieOptions());

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

export async function adminMe(req: Request, res: Response, next: NextFunction) {
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

/**
 * ✅ NEW: Forgot Password → send reset link email
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    const result = await authService.forgotPassword(email);

    // Always respond OK (security)
    // Only send email if we got a token back
    if ((result as any)?.rawToken) {
      const rawToken = (result as any).rawToken as string;
      const expiresMinutes = (result as any).expiresMinutes as number;
      const user = (result as any).user;

      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresMinutes,
      }).catch((err) => {
        console.error("Reset email failed:", err?.message || err);
      });
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * ✅ NEW: Reset Password → verify token + set new password
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    const result = await authService.resetPassword(token, password);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}
