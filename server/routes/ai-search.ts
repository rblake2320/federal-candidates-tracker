import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';
import { logEvent } from '../services/analytics.js';

export const aiSearchRouter = Router();

// ── GET /api/v1/search/ai?q=... ──────────────────────────────
// Fuzzy search across candidates and elections using pg_trgm
aiSearchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 50);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Search candidates by name (fuzzy)
    const candidatesResult = await query(
      `SELECT c.id, c.full_name, c.party, c.state, c.office, c.district,
              c.status, c.incumbent, c.photo_url,
              similarity(c.full_name, $1) AS score
       FROM candidates c
       WHERE c.full_name % $1 OR c.full_name ILIKE $2
       ORDER BY score DESC, c.full_name
       LIMIT $3`,
      [q, `%${q}%`, limit]
    );

    // Search elections by description/state
    const electionsResult = await query(
      `SELECT e.id, e.state, e.office, e.district, e.election_type,
              e.election_date, e.description, s.name as state_name,
              COALESCE(similarity(e.description, $1), 0) +
              CASE WHEN s.name ILIKE $2 THEN 0.5 ELSE 0 END AS score
       FROM elections e
       JOIN states s ON e.state = s.code
       WHERE e.description % $1
          OR e.description ILIKE $2
          OR s.name ILIKE $2
       ORDER BY score DESC, e.election_date
       LIMIT $3`,
      [q, `%${q}%`, limit]
    );

    logEvent({
      session_id: (req.headers['x-session-id'] as string) || crypto.randomUUID(),
      user_id: req.user?.userId,
      event_type: 'search',
      event_name: 'search_submit',
      properties: {
        query: q,
        result_count: candidatesResult.rows.length + electionsResult.rows.length,
      },
      cf_country: req.headers['cf-ipcountry'] as string,
      cf_region: req.headers['cf-region'] as string,
    });

    res.json({
      query: q,
      candidates: candidatesResult.rows,
      elections: electionsResult.rows,
      total_candidates: candidatesResult.rows.length,
      total_elections: electionsResult.rows.length,
    });
  } catch (error) {
    logger.error('Error in AI search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});
