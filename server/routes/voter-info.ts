import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';

export const voterInfoRouter = Router();

const STATE_CODE_RE = /^[A-Z]{2}$/;

// ── GET /api/v1/voter-info?state=XX&district=N ───────────────
// Lookup elections and candidates for a state/district
voterInfoRouter.get('/', async (req: Request, res: Response) => {
  try {
    const state = String(req.query.state || '').toUpperCase();
    const district = req.query.district ? parseInt(String(req.query.district), 10) : null;

    if (!state || !STATE_CODE_RE.test(state)) {
      return res.status(400).json({ error: 'Valid 2-letter state code is required' });
    }

    if (district !== null && (isNaN(district) || district < 0 || district > 53)) {
      return res.status(400).json({ error: 'Invalid district number' });
    }

    // Get elections for state
    const electionParams: (string | number)[] = [state];
    let electionWhere = 'e.state = $1';

    if (district !== null) {
      electionWhere += ' AND (e.district = $2 OR e.district IS NULL)';
      electionParams.push(district);
    }

    const electionsResult = await query(
      `SELECT e.*, s.name as state_name
       FROM elections e
       JOIN states s ON e.state = s.code
       WHERE ${electionWhere}
       ORDER BY e.election_date ASC`,
      electionParams
    );

    // Get candidates for those elections
    const electionIds = electionsResult.rows.map((e: { id: string }) => e.id);
    let candidates: unknown[] = [];

    if (electionIds.length > 0) {
      const candidatesResult = await query(
        `SELECT c.*
         FROM candidates c
         WHERE c.election_id = ANY($1::uuid[])
         ORDER BY c.party, c.full_name`,
        [electionIds]
      );
      candidates = candidatesResult.rows;
    }

    // Get state info
    const stateResult = await query(
      'SELECT * FROM states WHERE code = $1',
      [state]
    );

    res.json({
      state: stateResult.rows[0] || null,
      elections: electionsResult.rows,
      candidates,
      total_elections: electionsResult.rows.length,
      total_candidates: candidates.length,
    });
  } catch (error) {
    logger.error('Error in voter info lookup:', error);
    res.status(500).json({ error: 'Failed to lookup voter information' });
  }
});
