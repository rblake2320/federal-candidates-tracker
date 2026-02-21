/**
 * Ballotpedia Data Collector
 * Scrapes candidate profiles from Ballotpedia for 2026 elections.
 *
 * Note: Ballotpedia's API is limited. This uses their public pages with
 * structured data extraction. For production, apply for API access at
 * https://ballotpedia.org/Ballotpedia:API
 *
 * Usage: npm run collect:ballotpedia
 */

import pg from 'pg';
import { logger } from '../server/services/logger.js';

const { Pool } = pg;

const BALLOTPEDIA_BASE = 'https://ballotpedia.org';
const RATE_LIMIT_MS = 2000; // Be respectful — 1 req per 2 seconds
const MAX_RETRIES = 3;

// Known 2026 Senate races (Class II seats)
const SENATE_RACES_2026 = [
  'AL', 'AK', 'AR', 'CO', 'DE', 'GA', 'IA', 'ID', 'IL', 'KS',
  'KY', 'LA', 'ME', 'MA', 'MI', 'MN', 'MS', 'MT', 'NE', 'NH',
  'NJ', 'NM', 'NC', 'OK', 'OR', 'RI', 'SC', 'SD', 'TN', 'TX',
  'VA', 'WV', 'WY',
];

interface BallotpediaCandidate {
  name: string;
  party: string;
  state: string;
  office: 'senate' | 'house';
  district?: number;
  incumbent: boolean;
  ballotpediaUrl: string;
  website?: string;
  bio?: string;
}

const PARTY_MAP: Record<string, string> = {
  'Democratic': 'democratic',
  'Republican': 'republican',
  'Libertarian': 'libertarian',
  'Green': 'green',
  'Constitution': 'constitution',
  'Independent': 'independent',
  'Nonpartisan': 'no_party',
  'No party preference': 'no_party',
};

function mapParty(bpParty: string): string {
  return PARTY_MAP[bpParty] || 'other';
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FederalCandidatesTracker/1.0 (civic-data; contact@example.com)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          logger.warn(`  Ballotpedia ${response.status} — retrying (${attempt}/${retries})`);
          await sleep(RATE_LIMIT_MS * attempt * 2);
          continue;
        }
      }
      return response;
    } catch (err) {
      if (attempt < retries) {
        logger.warn(`  Network error — retrying (${attempt}/${retries})`);
        await sleep(RATE_LIMIT_MS * attempt);
        continue;
      }
      throw err;
    }
  }
  throw new Error('fetchWithRetry exhausted retries');
}

/**
 * Extract structured candidate data from a Ballotpedia election page.
 * This is a simplified parser — in production, use their API or a proper HTML parser.
 */
async function scrapeElectionPage(
  state: string,
  office: 'senate' | 'house',
  district?: number
): Promise<BallotpediaCandidate[]> {
  let slug: string;
  if (office === 'senate') {
    slug = `United_States_Senate_election_in_${state.replace(/ /g, '_')},_2026`;
  } else {
    slug = `${state.replace(/ /g, '_')}'s_${district}${getOrdinal(district || 0)}_Congressional_District_election,_2026`;
  }

  const url = `${BALLOTPEDIA_BASE}/${slug}`;
  logger.info(`  Fetching: ${url}`);

  const response = await fetchWithRetry(url);
  if (!response.ok) {
    if (response.status === 404) {
      logger.info(`  No Ballotpedia page yet for ${state} ${office} ${district || ''}`);
      return [];
    }
    throw new Error(`Ballotpedia error: ${response.status}`);
  }

  const html = await response.text();

  // Extract candidates from structured data / infoboxes
  // This is a simplified regex-based approach — use cheerio/JSDOM in production
  const candidates: BallotpediaCandidate[] = [];

  // Look for candidate table rows or infobox entries
  const candidatePattern = /class="[^"]*candidate[^"]*"[^>]*>([^<]+)/gi;
  let match;
  while ((match = candidatePattern.exec(html)) !== null) {
    const name = match[1].trim();
    if (name && name.length > 2 && name.length < 100) {
      candidates.push({
        name,
        party: 'other', // Would need deeper parsing for party
        state: state.substring(0, 2).toUpperCase(),
        office,
        district,
        incumbent: false,
        ballotpediaUrl: url,
      });
    }
  }

  return candidates;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

async function collectBallotpediaData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const runResult = await pool.query(
    `INSERT INTO collection_runs (source, status) VALUES ('ballotpedia', 'running') RETURNING id`
  );
  const runId = runResult.rows[0].id;

  let totalFound = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  const errors: { message: string; context?: string }[] = [];

  try {
    // Get all states from DB
    const statesResult = await pool.query(
      `SELECT code, name, house_seats FROM states ORDER BY code`
    );

    for (const state of statesResult.rows) {
      logger.info(`Processing ${state.name} (${state.code})...`);

      // Senate races
      if (SENATE_RACES_2026.includes(state.code)) {
        try {
          const candidates = await scrapeElectionPage(state.name, 'senate');
          totalFound += candidates.length;

          for (const cand of candidates) {
            try {
              // Find election
              const elResult = await pool.query(
                `SELECT id, senate_class FROM elections
                 WHERE state = $1 AND office = 'senate' AND district IS NULL
                 ORDER BY election_date DESC LIMIT 1`,
                [state.code]
              );

              if (elResult.rows.length === 0) continue;

              // Upsert by name + state + office (Ballotpedia doesn't have FEC IDs)
              await pool.query(
                `INSERT INTO candidates (
                  election_id, full_name, party, state, office, district, senate_class,
                  incumbent, status, election_type, election_date,
                  ballotpedia_url, data_confidence, data_sources, last_verified
                ) VALUES (
                  $1, $2, $3::party_affiliation, $4, 'senate'::office_type, NULL, $5,
                  $6, 'declared'::candidate_status, 'regular', '2026-11-03',
                  $7, 0.70, ARRAY['ballotpedia'], NOW()
                )
                ON CONFLICT DO NOTHING`,
                [
                  elResult.rows[0].id,
                  cand.name,
                  mapParty(cand.party),
                  state.code,
                  elResult.rows[0].senate_class,
                  cand.incumbent,
                  cand.ballotpediaUrl,
                ]
              );
              totalAdded++;
            } catch (err) {
              errors.push({ message: String(err), context: `${state.code} Senate ${cand.name}` });
            }
          }

          await sleep(RATE_LIMIT_MS);
        } catch (err) {
          errors.push({ message: String(err), context: `${state.code} Senate` });
        }
      }

      // House races
      for (let d = 1; d <= state.house_seats; d++) {
        try {
          const candidates = await scrapeElectionPage(state.name, 'house', d);
          totalFound += candidates.length;

          for (const cand of candidates) {
            try {
              const elResult = await pool.query(
                `SELECT id FROM elections
                 WHERE state = $1 AND office = 'house' AND district = $2
                 ORDER BY election_date DESC LIMIT 1`,
                [state.code, d]
              );

              if (elResult.rows.length === 0) continue;

              await pool.query(
                `INSERT INTO candidates (
                  election_id, full_name, party, state, office, district,
                  incumbent, status, election_type, election_date,
                  ballotpedia_url, data_confidence, data_sources, last_verified
                ) VALUES (
                  $1, $2, $3::party_affiliation, $4, 'house'::office_type, $5,
                  $6, 'declared'::candidate_status, 'regular', '2026-11-03',
                  $7, 0.70, ARRAY['ballotpedia'], NOW()
                )
                ON CONFLICT DO NOTHING`,
                [
                  elResult.rows[0].id,
                  cand.name,
                  mapParty(cand.party),
                  state.code,
                  d,
                  cand.incumbent,
                  cand.ballotpediaUrl,
                ]
              );
              totalAdded++;
            } catch (err) {
              errors.push({ message: String(err), context: `${state.code}-${d} ${cand.name}` });
            }
          }

          await sleep(RATE_LIMIT_MS);
        } catch (err) {
          errors.push({ message: String(err), context: `${state.code}-${d}` });
        }
      }
    }

    await pool.query(
      `UPDATE collection_runs SET
        status = 'completed', records_found = $2, records_added = $3,
        records_updated = $4, errors = $5, completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE id = $1`,
      [runId, totalFound, totalAdded, totalUpdated, errors.length > 0 ? JSON.stringify(errors) : null]
    );

    logger.info(`✅ Ballotpedia collection complete: ${totalFound} found, ${totalAdded} added, ${errors.length} errors`);
  } catch (error) {
    await pool.query(
      `UPDATE collection_runs SET status = 'failed', errors = $2, completed_at = NOW() WHERE id = $1`,
      [runId, JSON.stringify([{ message: String(error) }])]
    );
    logger.error('Ballotpedia collection failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

collectBallotpediaData().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
