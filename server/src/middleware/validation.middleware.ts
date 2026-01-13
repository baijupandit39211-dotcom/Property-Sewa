import type { Request, Response, NextFunction } from "express";

export function validate(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of requiredFields) {
      if (req.body?.[field] === undefined || req.body?.[field] === "") {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }
    next();
  };
}
