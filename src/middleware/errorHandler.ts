import type { Request, Response, NextFunction } from "express";

/**
 * Global error handler.  Catches errors forwarded by asyncHandler (or
 * any middleware that calls next(err)), producing a uniform error shape
 * without duplicating error-formatting in every route.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${err.message}`, err.stack);
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
}
