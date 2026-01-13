import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

type AppError = Error & { statusCode?: number };

export function notFound(req: Request, _res: Response, next: NextFunction) {
  const err: AppError = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode || 500;

  logger.error("\n==================== API ERROR ====================");
  logger.error("Time:", new Date().toISOString());
  logger.error("Route:", req.method, req.originalUrl);
  logger.error("Status:", status);
  logger.error("Message:", err.message);
  if (err.stack) logger.error("Stack:\n", err.stack);
  logger.error("Body:", req.body);
  logger.error("Query:", req.query);
  logger.error("Params:", req.params);
  logger.error("===================================================\n");

  res.status(status).json({
    success: false,
    message: err.message || "Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
}
