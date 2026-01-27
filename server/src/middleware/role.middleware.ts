import type { Request, Response, NextFunction } from "express";

export function requireRoles(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = String(req.user?.role || "").toLowerCase();

    if (!role) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const allowed = roles.map((r) => r.toLowerCase());
    if (!allowed.includes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    next();
  };
}

// ✅ alias so your payment.routes.ts can import requireRole
export const requireRole = requireRoles;

export const requireAdminRole = requireRoles(["admin", "superadmin"]);
