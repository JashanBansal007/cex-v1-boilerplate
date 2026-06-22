import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "dev-secret-change-in-production";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(403).json({ success: false, error: "Invalid or expired token" });
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}
