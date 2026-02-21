import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';

export const statesRouter = Router();

// ── GET /api/v1/states ────────────────────────────────────
// All states with race counts and candidate totals
statesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`SELECT * FROM v_state_summary ORDER BY state ASC`);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ data: result.rows });
  } catch (error) {
    logger.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// ── GET /api/v1/states/:code ──────────────────────────────
// Detailed state view with all races and candidates
statesRouter.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid state code' });
    }

    // State info
    const stateResult = await query(
      `SELECT code, name, fips_code, house_seats, region FROM states WHERE code = $1`,
      [code]
    );
    if (stateResult.rows.length === 0) {
      return res.status(404).json({ error: 'State not found' });
    }

    // All elections in state
    const elections = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM candidates c
               WHERE c.election_id = e.id AND c.status != 'withdrawn') as candidate_count
       FROM elections e
       WHERE e.state = $1
       ORDER BY e.office DESC, e.district ASC NULLS FIRST`,
      [code]
    );

    // All candidates in state
    const candidates = await query(
      `SELECT c.id, c.full_name, c.party, c.office, c.district, c.senate_class,
              c.incumbent, c.status, c.total_raised, c.latest_poll_pct,
              c.photo_url, c.fec_candidate_id, c.election_id
       FROM candidates c
       WHERE c.state = $1 AND c.status != 'withdrawn'
       ORDER BY c.office DESC, c.district ASC NULLS FIRST, c.party ASC`,
      [code]
    );

    // Party breakdown for this state
    const partyBreakdown = await query<{ party: string; count: string }>(
      `SELECT party, COUNT(*) as count
       FROM candidates
       WHERE state = $1 AND status NOT IN ('withdrawn')
       GROUP BY party
       ORDER BY count DESC`,
      [code]
    );

    const partyMap: Record<string, number> = {};
    for (const row of partyBreakdown.rows) {
      partyMap[row.party] = parseInt(row.count, 10);
    }

    res.json({
      state: stateResult.rows[0],
      elections: elections.rows,
      candidates: candidates.rows,
      summary: {
        total_candidates: candidates.rows.length,
        total_races: elections.rows.length,
        candidates_by_party: partyMap,
      },
    });
  } catch (error) {
    logger.error('Error fetching state detail:', error);
    res.status(500).json({ error: 'Failed to fetch state data' });
  }
});