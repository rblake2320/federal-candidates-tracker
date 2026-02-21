import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';
import { requireAuth } from '../middleware/auth.js';

export const exportRouter = Router();

// CSV injection prevention: prefix dangerous leading characters with a single quote
// so Excel/LibreOffice won't interpret cells as formulas.
const CSV_INJECTION_RE = /^[=+\-@\t\r]/;
function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (CSV_INJECTION_RE.test(str)) {
    return "'" + str;
  }
  return str;
}

// All export endpoints require authentication
exportRouter.use(requireAuth);

// ── GET /api/v1/data/export ───────────────────────────────
// Bulk export candidates as CSV or JSON
exportRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { format = 'json', state, office, party, status } = req.query;

    const conditions: string[] = ["c.status != 'withdrawn'"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (state) {
      const states = (state as string).split(',').map(s => s.trim().toUpperCase());
      conditions.push(`c.state = ANY($${paramIdx++})`);
      params.push(states);
    }
    if (office) {
      conditions.push(`c.office = $${paramIdx++}::office_type`);
      params.push(office);
    }
    if (party) {
      conditions.push(`c.party = $${paramIdx++}::party_affiliation`);
      params.push(party);
    }
    if (status) {
      conditions.push(`c.status = $${paramIdx++}::candidate_status`);
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT
        c.full_name, c.first_name, c.last_name, c.party, c.state,
        c.office, c.district, c.senate_class, c.incumbent, c.status,
        c.election_type, c.election_date, c.fec_candidate_id,
        c.website, c.ballotpedia_url, c.total_raised, c.total_spent,
        c.cash_on_hand, c.latest_poll_pct, c.data_confidence,
        s.name as state_name,
        e.cook_rating, e.is_competitive
       FROM candidates c
       JOIN states s ON c.state = s.code
       JOIN elections e ON c.election_id = e.id
       ${whereClause}
       ORDER BY c.state ASC, c.office DESC, c.district ASC NULLS FIRST`,
      params
    );

    if (format === 'csv') {
      const rows = result.rows;
      if (rows.length === 0) {
        return res.status(200).type('text/csv').send('');
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => {
            const raw = (row as Record<string, unknown>)[h];
            const str = sanitizeCsvValue(raw);
            // Escape CSV values containing commas, quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"` ;
            }
            return str;
          }).join(',')
        ),
      ];

      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="candidates-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      });
      return res.send(csvLines.join('\n'));
    }

    // Default: JSON
    res.set({
      'Content-Disposition': `attachment; filename="candidates-export-${new Date().toISOString().slice(0, 10)}.json"`,
    });
    res.json({
      exported_at: new Date().toISOString(),
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});