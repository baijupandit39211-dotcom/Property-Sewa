import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

type AppError = Error & { statusCode?: number };

export function notFound(req: Request, _res: Response, next: NextFunction) {
  const err: AppError = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.statusCode) || 500;

  const message =
    err?.message ||
    (typeof err === "string" ? err : "") ||
    "Server Error";

  logger.error("\n==================== API ERROR ====================");
  logger.error("Time:", new Date().toISOString());
  logger.error("Route:", req.method, req.originalUrl);
  logger.error("Status:", status);
  logger.error("Message:", message);
  if (err?.stack) logger.error("Stack:\n", err.stack);
  logger.error("Body:", req.body);
  logger.error("Query:", req.query);
  logger.error("Params:", req.params);
  logger.error("===================================================\n");

  return res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" ? { stack: err?.stack } : {}),
  });
}
