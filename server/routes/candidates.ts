import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';
import { logEvent } from '../services/analytics.js';

export const candidatesRouter = Router();

// UUID v4 validation regex
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Enum allowlists ─────────────────────────────────────────
const VALID_PARTY = new Set([
  'democratic', 'republican', 'libertarian', 'green',
  'constitution', 'independent', 'no_party', 'other',
]);
const VALID_OFFICE = new Set(['senate', 'house', 'governor']);
const VALID_STATUS = new Set([
  'declared', 'exploratory', 'filed', 'qualified',
  'withdrawn', 'won', 'lost', 'runoff',
]);
const VALID_ELECTION_TYPE = new Set(['regular', 'special', 'primary', 'runoff']);

// FIX: Strict allowlist map for sort columns — prevents injection via string concat
const SORT_COLUMN_MAP: Record<string, string> = {
  state: 'c.state',
  district: 'c.district',
  full_name: 'c.full_name',
  party: 'c.party',
  office: 'c.office',
  status: 'c.status',
  created_at: 'c.created_at',
  data_confidence: 'c.data_confidence',
  total_raised: 'c.total_raised',
};

// ── GET /api/v1/candidates ────────────────────────────────
// List all candidates with filtering, search, and pagination
candidatesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      state,
      party,
      office,
      district,
      status,
      incumbent,
      election_type,
      search,
      sort = 'state,district',
      order = 'asc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (state) {
      const states = (state as string).split(',').map(s => s.trim().toUpperCase());
      // Validate: only 2-letter uppercase codes
      if (states.some(s => !/^[A-Z]{2}$/.test(s))) {
        return res.status(400).json({ error: 'Invalid state code format' });
      }
      conditions.push(`c.state = ANY($${paramIdx++})`);
      params.push(states);
    }

    if (party) {
      const parties = (party as string).split(',').map(p => p.trim().toLowerCase());
      if (parties.some(p => !VALID_PARTY.has(p))) {
        return res.status(400).json({ error: `Invalid party value. Allowed: ${[...VALID_PARTY].join(', ')}` });
      }
      conditions.push(`c.party = ANY($${paramIdx++}::party_affiliation[])`);
      params.push(parties);
    }

    if (office) {
      if (!VALID_OFFICE.has(office as string)) {
        return res.status(400).json({ error: `Invalid office value. Allowed: ${[...VALID_OFFICE].join(', ')}` });
      }
      conditions.push(`c.office = $${paramIdx++}::office_type`);
      params.push(office);
    }

    if (district) {
      const districtNum = parseInt(district as string, 10);
      if (isNaN(districtNum) || districtNum < 0 || districtNum > 53) {
        return res.status(400).json({ error: 'Invalid district number' });
      }
      conditions.push(`c.district = $${paramIdx++}`);
      params.push(districtNum);
    }

    if (status) {
      if (!VALID_STATUS.has(status as string)) {
        return res.status(400).json({ error: `Invalid status value. Allowed: ${[...VALID_STATUS].join(', ')}` });
      }
      conditions.push(`c.status = $${paramIdx++}::candidate_status`);
      params.push(status);
    }

    if (incumbent !== undefined) {
      conditions.push(`c.incumbent = $${paramIdx++}`);
      params.push(incumbent === 'true');
    }

    if (election_type) {
      if (!VALID_ELECTION_TYPE.has(election_type as string)) {
        return res.status(400).json({ error: `Invalid election_type value. Allowed: ${[...VALID_ELECTION_TYPE].join(', ')}` });
      }
      conditions.push(`c.election_type = $${paramIdx++}::election_type`);
      params.push(election_type);
    }

    if (search) {
      // FIX: Limit search length to prevent abuse
      const searchStr = (search as string).slice(0, 200);
      conditions.push(`to_tsvector('english', c.full_name) @@ plainto_tsquery('english', $${paramIdx++})`);
      params.push(searchStr);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // FIX: Use strict map lookup instead of string interpolation for sort columns
    const sortCols = (sort as string).split(',')
      .map(s => SORT_COLUMN_MAP[s.trim()])
      .filter(Boolean);
    const orderDir = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const orderClause = sortCols.length > 0
      ? `ORDER BY ${sortCols.join(', ')} ${orderDir}`
      : 'ORDER BY c.state ASC, c.district ASC NULLS FIRST';

    // Count total
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM candidates c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch page
    const dataResult = await query(
      `SELECT c.*, s.name as state_name
       FROM candidates c
       JOIN states s ON c.state = s.code
       ${whereClause}
       ${orderClause}
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
    logger.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// FIX: Reordered routes — specific paths BEFORE parameterized /:id
// Otherwise /state/:state and /district/:state/:district never match

// ── GET /api/v1/candidates/state/:state ───────────────────
candidatesRouter.get('/state/:state', async (req: Request, res: Response) => {
  try {
    const state = String(req.params.state).toUpperCase();
    if (!/^[A-Z]{2}$/.test(state)) {
      return res.status(400).json({ error: 'Invalid state code' });
    }

    const result = await query(
      `SELECT c.*, s.name as state_name
       FROM candidates c
       JOIN states s ON c.state = s.code
       WHERE c.state = $1 AND c.status != 'withdrawn'
       ORDER BY c.office DESC, c.district ASC NULLS FIRST, c.party ASC`,
      [state]
    );

    res.json({
      state,
      total: result.rows.length,
      candidates: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching candidates by state:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// ── GET /api/v1/candidates/district/:state/:district ──────
candidatesRouter.get('/district/:state/:district', async (req: Request, res: Response) => {
  try {
    const state = String(req.params.state).toUpperCase();
    if (!/^[A-Z]{2}$/.test(state)) {
      return res.status(400).json({ error: 'Invalid state code' });
    }

    const district = parseInt(String(req.params.district), 10);
    if (isNaN(district) || district < 0 || district > 53) {
      return res.status(400).json({ error: 'Invalid district number' });
    }

    const result = await query(
      `SELECT c.*, s.name as state_name
       FROM candidates c
       JOIN states s ON c.state = s.code
       WHERE c.state = $1 AND c.district = $2 AND c.status != 'withdrawn'
       ORDER BY c.party ASC`,
      [state, district]
    );

    res.json({
      state,
      district,
      total: result.rows.length,
      candidates: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching candidates by district:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// ── GET /api/v1/candidates/:id ────────────────────────────
// FIX: Moved AFTER specific routes so /state/ and /district/ match first
candidatesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    // FIX: Validate UUID format before hitting Postgres
    if (!UUID_RE.test(String(req.params.id))) {
      return res.status(400).json({ error: 'Invalid candidate ID format' });
    }

    const result = await query(
      `SELECT c.*, s.name as state_name,
              e.cook_rating, e.is_competitive, e.primary_date, e.filing_deadline
       FROM candidates c
       JOIN states s ON c.state = s.code
       JOIN elections e ON c.election_id = e.id
       WHERE c.id = $1`,
      [String(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = result.rows[0];
    logEvent({
      session_id: (req.headers['x-session-id'] as string) || crypto.randomUUID(),
      user_id: req.user?.userId,
      event_type: 'engagement',
      event_name: 'candidate_view',
      properties: { candidate_id: candidate.id, state: candidate.state, office: candidate.office },
      cf_country: req.headers['cf-ipcountry'] as string,
      cf_region: req.headers['cf-region'] as string,
    });

    res.json({ data: candidate });
  } catch (error) {
    logger.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});