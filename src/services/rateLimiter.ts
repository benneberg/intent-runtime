import { Request, Response, NextFunction } from "express";
import { Logger } from "./logger.js";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const tracker = new Map<string, RateLimitRecord>();

  // Cleanup expired windows periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tracker.entries()) {
      if (now > record.resetAt) {
        tracker.delete(key);
      }
    }
  }, 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client identifier
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "global";
    const now = Date.now();

    let record = tracker.get(clientIp);
    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      tracker.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.maxRequests - record.count);
    const resetSec = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSec);

    if (record.count > options.maxRequests) {
      Logger.warn("Rate limit exceeded", { clientIp, count: record.count, limit: options.maxRequests });
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please retry in ${resetSec} seconds.`,
        retry_after: resetSec,
      });
    }

    next();
  };
}
