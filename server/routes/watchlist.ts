import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';
import { requireAuth } from '../middleware/auth.js';

export const watchlistRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/v1/watchlist ────────────────────────────────────
// Get user's watchlisted elections
watchlistRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT e.*, s.name as state_name
       FROM watchlist w
       JOIN elections e ON w.election_id = e.id
       JOIN states s ON e.state = s.code
       WHERE w.user_id = $1
       ORDER BY e.election_date ASC`,
      [req.user!.userId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    logger.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// ── POST /api/v1/watchlist ───────────────────────────────────
// Add election to watchlist
watchlistRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { election_id } = req.body;

    if (!election_id || !UUID_RE.test(String(election_id))) {
      return res.status(400).json({ error: 'Valid election_id is required' });
    }

    // Verify election exists
    const electionResult = await query(
      'SELECT id FROM elections WHERE id = $1',
      [election_id]
    );
    if (electionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Insert with ON CONFLICT to handle duplicates gracefully
    await query(
      `INSERT INTO watchlist (user_id, election_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, election_id) DO NOTHING`,
      [req.user!.userId, election_id]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    logger.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// ── DELETE /api/v1/watchlist/:electionId ─────────────────────
// Remove election from watchlist
watchlistRouter.delete('/:electionId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.electionId))) {
      return res.status(400).json({ error: 'Invalid election ID format' });
    }

    const result = await query(
      'DELETE FROM watchlist WHERE user_id = $1 AND election_id = $2 RETURNING id',
      [req.user!.userId, req.params.electionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Election not in watchlist' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});
