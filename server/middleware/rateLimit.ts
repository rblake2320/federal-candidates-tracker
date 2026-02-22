import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * For production, use Redis-backed solution (e.g., express-rate-limit + rate-limit-redis).
 */
export function rateLimit({
  windowMs = 60 * 60 * 1000, // 1 hour
  max = 100,
  keyGenerator,
}: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.headers['cf-connecting-ip'] as string)
        || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
        || req.ip
        || req.socket.remoteAddress
        || 'unknown';

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - entry.count);
    res.set({
      'X-RateLimit-Limit': String(max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
    });

    if (entry.count > max) {
      logger.warn(`Rate limit exceeded for ${key}`);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }

    next();
  };
}

/**
 * API key-based rate limiting — reads tier from the key's config.
 */
export function apiKeyRateLimit() {
  return rateLimit({
    max: 1000, // Higher limit for API key holders
    keyGenerator: (req) => {
      const apiKey = req.headers['x-api-key'] as string;
      return apiKey ? `api:${apiKey}` : req.ip || 'unknown';
    },
  });
}