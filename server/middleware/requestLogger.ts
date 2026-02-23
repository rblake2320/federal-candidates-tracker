import { Request, Response, NextFunction } from 'express';
import { logApiRequest } from '../services/analytics.js';

/**
 * Normalize an endpoint path: strip query params and replace UUIDs with :id.
 */
function normalizeEndpoint(path: string): string {
  return path
    .replace(/\?.*$/, '')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .toLowerCase();
}

/**
 * Express middleware that logs every API request to the api_request_log table.
 * Uses res.on('finish') so logging happens after the response is sent.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    // Skip health checks to avoid noise
    if (req.path === '/health') return;

    logApiRequest({
      method: req.method,
      endpoint: normalizeEndpoint(req.path),
      user_id: req.user?.userId,
      status_code: res.statusCode,
      response_time_ms: Date.now() - startTime,
      cf_country: req.headers['cf-ipcountry'] as string | undefined,
      cf_ray_id: req.headers['cf-ray'] as string | undefined,
    });
  });

  next();
}
