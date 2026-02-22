import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';

export const electionsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_OFFICE = new Set(['senate', 'house', 'governor']);
const VALID_ELECTION_TYPE = new Set(['regular', 'special']);

// ── GET /api/v1/elections ─────────────────────────────────
electionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      state,
      office,
      election_type,
      competitive,
      sort = 'election_date',
      order = 'asc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (state) {
      const states = (state as string).split(',').map(s => s.trim().toUpperCase());
      if (states.some(s => !/^[A-Z]{2}$/.test(s))) {
        return res.status(400).json({ error: 'Invalid state code' });
      }
      conditions.push(`e.state = ANY($${paramIdx++})`);
      params.push(states);
    }

    if (office) {
      if (!VALID_OFFICE.has(office as string)) {
        return res.status(400).json({ error: `Invalid office value. Allowed: ${[...VALID_OFFICE].join(', ')}` });
      }
      conditions.push(`e.office = $${paramIdx++}::office_type`);
      params.push(office);
    }

    if (election_type) {
      if (!VALID_ELECTION_TYPE.has(election_type as string)) {
        return res.status(400).json({ error: `Invalid election_type value. Allowed: ${[...VALID_ELECTION_TYPE].join(', ')}` });
      }
      conditions.push(`e.election_type = $${paramIdx++}::election_type`);
      params.push(election_type);
    }

    if (competitive === 'true') {
      conditions.push(`e.is_competitive = TRUE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const SORT_MAP: Record<string, string> = {
      election_date: 'e.election_date',
      state: 'e.state',
      office: 'e.office',
      total_candidates: 'e.total_candidates',
    };
    const sortCol = SORT_MAP[(sort as string)] || 'e.election_date';
    const orderDir = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM elections e ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT e.*, s.name as state_name
       FROM elections e
       JOIN states s ON e.state = s.code
       ${whereClause}
       ORDER BY ${sortCol} ${orderDir}
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limitNum, offset]
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching elections:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// ── GET /api/v1/elections/special ──────────────────────────
electionsRouter.get('/special', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT e.*, s.name as state_name,
              (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id AND c.status != 'withdrawn') as candidate_count
       FROM elections e
       JOIN states s ON e.state = s.code
       WHERE e.election_type = 'special'
       ORDER BY e.election_date ASC`
    );

    res.json({
      total: result.rows.length,
      elections: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching special elections:', error);
    res.status(500).json({ error: 'Failed to fetch special elections' });
  }
});

// ── GET /api/v1/elections/:id ─────────────────────────────
electionsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid election ID format' });
    }

    const result = await query(
      `SELECT e.*, s.name as state_name
       FROM elections e
       JOIN states s ON e.state = s.code
       WHERE e.id = $1`,
      [String(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Get candidates for this election
    const candidates = await query(
      `SELECT c.id, c.full_name, c.party, c.incumbent, c.status,
              c.total_raised, c.latest_poll_pct, c.photo_url
       FROM candidates c
       WHERE c.election_id = $1 AND c.status != 'withdrawn'
       ORDER BY c.party ASC, c.full_name ASC`,
      [String(req.params.id)]
    );

    res.json({
      data: {
        ...result.rows[0],
        candidates: candidates.rows,
      },
    });
  } catch (error) {
    logger.error('Error fetching election:', error);
    res.status(500).json({ error: 'Failed to fetch election' });
  }
});