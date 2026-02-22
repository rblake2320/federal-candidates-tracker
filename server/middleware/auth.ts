import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../services/logger.js';

const KNOWN_DEFAULTS = new Set(['change-me-in-production', 'replace-me-in-production']);
const envSecret = process.env.JWT_SECRET;
if (!envSecret || KNOWN_DEFAULTS.has(envSecret)) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET must be set to a strong random value in production');
  }
  logger.warn('JWT_SECRET not set or using a known default — auth tokens are insecure');
}
const JWT_SECRET: string = envSecret || 'dev-only-insecure-fallback';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer' | 'voter' | 'candidate';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Require valid JWT for protected routes.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    logger.warn('JWT verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require specific role(s).
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Generate a JWT token.
 */
export function generateToken(payload: AuthPayload, expiresIn: string | number = '24h'): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}