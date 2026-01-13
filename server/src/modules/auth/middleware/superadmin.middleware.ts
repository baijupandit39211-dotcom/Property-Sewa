import type { Request, Response, NextFunction } from "express";

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });

  if (req.user.role !== "superadmin") {
    return res.status(403).json({ success: false, message: "Superadmin only" });
  }

  next();
}
