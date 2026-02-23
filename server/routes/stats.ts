import { Router, Request, Response } from 'express';
import { query } from '../services/database.js';
import { logger } from '../services/logger.js';

export const statsRouter = Router();

// ── GET /api/v1/stats ─────────────────────────────────────
// Aggregate statistics for the dashboard
statsRouter.get('/', async (req: Request, res: Response) => {
  try {
    // Run all stat queries in parallel
    const [
      candidateStats,
      partyBreakdown,
      officeBreakdown,
      specialElections,
      confidenceStats,
      recentActivity,
      topRaised,
    ] = await Promise.all([
      // Total candidates (non-withdrawn)
      query<{
        total: string;
        incumbents: string;
        challengers: string;
      }>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE incumbent = TRUE) as incumbents,
          COUNT(*) FILTER (WHERE incumbent = FALSE) as challengers
        FROM candidates
        WHERE status NOT IN ('withdrawn')
      `),

      // Candidates by party
      query<{ party: string; count: string }>(`
        SELECT party, COUNT(*) as count
        FROM candidates
        WHERE status NOT IN ('withdrawn')
        GROUP BY party
        ORDER BY count DESC
      `),

      // Races by office
      query<{ office: string; race_count: string; candidate_count: string }>(`
        SELECT
          e.office,
          COUNT(DISTINCT e.id) as race_count,
          COUNT(c.id) FILTER (WHERE c.status NOT IN ('withdrawn')) as candidate_count
        FROM elections e
        LEFT JOIN candidates c ON c.election_id = e.id
        GROUP BY e.office
      `),

      // Special elections
      query<{ count: string }>(`
        SELECT COUNT(*) as count
        FROM elections
        WHERE election_type = 'special'
      `),

      // Data confidence
      query<{ avg_confidence: string; high_confidence: string; low_confidence: string }>(`
        SELECT
          AVG(data_confidence) as avg_confidence,
          COUNT(*) FILTER (WHERE data_confidence >= 0.8) as high_confidence,
          COUNT(*) FILTER (WHERE data_confidence < 0.5) as low_confidence
        FROM candidates
        WHERE status NOT IN ('withdrawn')
      `),

      // Recent collection activity
      query<{ source: string; status: string; records_found: number; completed_at: string }>(`
        SELECT source, status, records_found, completed_at
        FROM collection_runs
        ORDER BY started_at DESC
        LIMIT 5
      `),

      // Top fundraisers
      query<{ full_name: string; state: string; office: string; party: string; total_raised: string }>(`
        SELECT full_name, state, office, party, total_raised
        FROM candidates
        WHERE total_raised IS NOT NULL AND status NOT IN ('withdrawn')
        ORDER BY total_raised DESC
        LIMIT 10
      `),
    ]);

    // Build party map
    const candidatesByParty: Record<string, number> = {};
    for (const row of partyBreakdown.rows) {
      candidatesByParty[row.party] = parseInt(row.count, 10);
    }

    // Build office map
    const senateRow = officeBreakdown.rows.find(r => r.office === 'senate');
    const houseRow = officeBreakdown.rows.find(r => r.office === 'house');
    const governorRow = officeBreakdown.rows.find(r => r.office === 'governor');

    const stats = {
      total_candidates: parseInt(candidateStats.rows[0].total, 10),
      total_incumbents: parseInt(candidateStats.rows[0].incumbents, 10),
      total_challengers: parseInt(candidateStats.rows[0].challengers, 10),
      total_senate_races: parseInt(senateRow?.race_count || '0', 10),
      total_house_races: parseInt(houseRow?.race_count || '0', 10),
      total_governor_races: parseInt(governorRow?.race_count || '0', 10),
      total_special_elections: parseInt(specialElections.rows[0].count, 10),
      senate_candidates: parseInt(senateRow?.candidate_count || '0', 10),
      house_candidates: parseInt(houseRow?.candidate_count || '0', 10),
      governor_candidates: parseInt(governorRow?.candidate_count || '0', 10),
      candidates_by_party: candidatesByParty,
      avg_data_confidence: parseFloat(confidenceStats.rows[0].avg_confidence) || 0,
      high_confidence_count: parseInt(confidenceStats.rows[0].high_confidence, 10),
      low_confidence_count: parseInt(confidenceStats.rows[0].low_confidence, 10),
      recent_collections: recentActivity.rows,
      top_fundraisers: topRaised.rows.map(r => ({
        ...r,
        total_raised: parseFloat(r.total_raised),
      })),
      last_updated: new Date().toISOString(),
    };

    // Cache for 5 minutes
    res.set('Cache-Control', 'public, max-age=300');
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});