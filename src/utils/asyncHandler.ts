import type { Request, Response, NextFunction } from "express";

/**
 * Wraps an async route handler so rejected promises are forwarded to
 * the Express error middleware instead of becoming unhandled rejections.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
