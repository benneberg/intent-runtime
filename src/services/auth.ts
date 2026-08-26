import { Request, Response, NextFunction } from "express";
import { Logger } from "./logger.js";

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.ADMIN_API_KEY;

  // If no admin key is configured, allow requests in development mode
  if (!adminKey || adminKey.trim() === "") {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const customHeader = req.headers["x-admin-key"] as string;

  let providedKey: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedKey = authHeader.slice(7).trim();
  } else if (customHeader) {
    providedKey = customHeader.trim();
  }

  if (!providedKey || providedKey !== adminKey.trim()) {
    Logger.warn("Unauthorized administrative endpoint access attempt", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid administrative API key required in Authorization or X-Admin-Key header.",
    });
  }

  next();
}
