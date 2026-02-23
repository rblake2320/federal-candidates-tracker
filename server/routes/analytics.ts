import { Router, Request, Response } from 'express';
import { logEventBatch, type AnalyticsEvent } from '../services/analytics.js';
import { logger } from '../services/logger.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const analyticsRouter = Router();

// Stricter rate limit for analytics endpoint: 10 req/min per IP
analyticsRouter.use(rateLimit({ windowMs: 60_000, max: 10 }));

// Allowlisted property keys to prevent arbitrary data injection
const ALLOWED_PROPERTY_KEYS = new Set([
  'candidate_id', 'election_id', 'state', 'office', 'district',
  'party', 'query', 'result_count', 'filters', 'from_page',
  'element', 'position', 'link_type', 'link_url',
]);

function sanitizeProperties(props: unknown): Record<string, unknown> | null {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return null;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (ALLOWED_PROPERTY_KEYS.has(key)) {
      // Only allow primitives and plain objects as values
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        sanitized[key] = typeof value === 'string' ? value.slice(0, 500) : value;
      }
      // Reject nested objects/arrays — only primitives allowed as property values
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

// ── POST /api/v1/analytics/events ───────────────────────────
analyticsRouter.post('/events', async (req: Request, res: Response) => {
  try {
    const { events } = req.body as { events: unknown[] };

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }
    if (events.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 events per batch' });
    }

    const cfCountry = req.headers['cf-ipcountry'] as string | undefined;
    const cfRegion = req.headers['cf-region'] as string | undefined;

    const enrichedEvents: AnalyticsEvent[] = [];

    for (const raw of events) {
      if (!raw || typeof raw !== 'object') continue;
      const e = raw as Record<string, unknown>;

      // event_type and event_name are required
      if (typeof e.event_type !== 'string' || typeof e.event_name !== 'string') continue;
      if (typeof e.session_id !== 'string') continue;

      // Validate timestamp if provided — reject unparseable strings
      let ts: string | undefined;
      if (typeof e.timestamp === 'string') {
        const parsed = Date.parse(e.timestamp);
        if (!isNaN(parsed)) ts = e.timestamp;
      }

      enrichedEvents.push({
        session_id: e.session_id as string,
        user_id: req.user?.userId || null,
        event_type: (e.event_type as string).slice(0, 50),
        event_name: (e.event_name as string).slice(0, 100),
        properties: sanitizeProperties(e.properties),
        page_url: typeof e.page_url === 'string' ? (e.page_url as string).slice(0, 2000) : null,
        referrer: typeof e.referrer === 'string' ? (e.referrer as string).slice(0, 2000) : null,
        cf_country: cfCountry || null,
        cf_region: cfRegion || null,
        timestamp: ts,
        duration_ms: typeof e.duration_ms === 'number' ? Math.min(Math.max(0, e.duration_ms), 3_600_000) : null,
      });
    }

    if (enrichedEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events in batch' });
    }

    const count = await logEventBatch(enrichedEvents);
    res.json({ ok: true, count });
  } catch (err) {
    logger.error('Analytics events endpoint error:', err);
    res.status(500).json({ error: 'Failed to log events' });
  }
});
