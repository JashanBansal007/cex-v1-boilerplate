import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that extracts `userId` from `req.query` and rejects
 * the request with 400 when it is missing.  Replaces the identical
 * guard block that was copy-pasted across /fills, /orders,
 * GET /order/:orderId, and DELETE /order/:orderId.
 */
export function requireUserId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = req.query.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ success: false, error: "userId is required" });
    return;
  }
  next();
}
