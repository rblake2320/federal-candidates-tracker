/**
 * FEC Data Collector
 * Pulls candidate filings from the Federal Election Commission API
 * for the 2026 election cycle.
 *
 * Usage: npm run collect:fec
 * Env:   FEC_API_KEY (get yours at https://api.open.fec.gov/developers/)
 */

import pg from 'pg';
import { logger } from '../server/services/logger.js';

const { Pool } = pg;

const FEC_BASE_URL = 'https://api.open.fec.gov/v1';
const FEC_API_KEY = process.env.FEC_API_KEY;
const ELECTION_CYCLE = 2026;
const RATE_LIMIT_MS = 500; // 2 req/sec to stay under FEC limits
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 2000;

interface FECCandidate {
  candidate_id: string;
  name: string;
  party_full: string;
  party: string;
  state: string;
  district: string;
  office: string;
  office_full: string;
  incumbent_challenge: string;
  candidate_status: string;
  election_years: number[];
}

const PARTY_MAP: Record<string, string> = {
  DEM: 'democratic',
  REP: 'republican',
  LIB: 'libertarian',
  GRE: 'green',
  CON: 'constitution',
  IND: 'independent',
  NNE: 'no_party',
};

function mapParty(fecParty: string): string {
  return PARTY_MAP[fecParty] || 'other';
}

function mapOffice(fecOffice: string): string {
  return fecOffice === 'S' ? 'senate' : 'house';
}

function mapStatus(fecStatus: string, _challenge: string): string {
  if (fecStatus === 'C') return 'declared';
  if (fecStatus === 'N') return 'declared';
  if (fecStatus === 'P') return 'filed';
  return 'declared';
}

/**
 * Parse FEC-formatted candidate name: "LAST, FIRST MIDDLE SUFFIX"
 * Handles edge cases: hyphenated names, suffixes (Jr, III), single names.
 */
function parseFECName(fecName: string): { fullName: string; firstName: string; lastName: string } {
  const parts = fecName.split(',').map(s => s.trim());
  const lastName = parts[0] || '';

  if (parts.length < 2 || !parts[1]) {
    // Single name — no comma separator
    return { fullName: fecName.trim(), firstName: '', lastName: fecName.trim() };
  }

  const restParts = parts[1].split(/\s+/);
  const firstName = restParts[0] || '';

  // Reconstruct: "FIRST LAST" — keep it clean
  const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();

  return { fullName: fullName || fecName, firstName, lastName };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * FIX: Retry wrapper for transient FEC API failures (429, 503, network errors)
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);

      // Retry on rate limit or server errors
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const backoff = RETRY_BACKOFF_MS * attempt;
          logger.warn(`  FEC API ${response.status} — retrying in ${backoff}ms (attempt ${attempt}/${retries})`);
          await sleep(backoff);
          continue;
        }
      }

      return response;
    } catch (err) {
      if (attempt < retries) {
        const backoff = RETRY_BACKOFF_MS * attempt;
        logger.warn(`  Network error — retrying in ${backoff}ms (attempt ${attempt}/${retries}): ${err}`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('fetchWithRetry exhausted all retries');
}

async function fetchFECPage(office: string, page: number): Promise<{ results: FECCandidate[]; pages: number }> {
  const url = new URL(`${FEC_BASE_URL}/candidates`);
  url.searchParams.set('api_key', FEC_API_KEY!);
  url.searchParams.set('election_year', String(ELECTION_CYCLE));
  url.searchParams.set('office', office); // S = Senate, H = House
  url.searchParams.set('candidate_status', 'C'); // Currently running
  url.searchParams.set('sort', 'name');
  url.searchParams.set('per_page', '100');
  url.searchParams.set('page', String(page));

  const response = await fetchWithRetry(url.toString());
  if (!response.ok) {
    throw new Error(`FEC API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { results: any[]; pagination: { pages: number } };
  return {
    results: data.results,
    pages: data.pagination.pages,
  };
}

async function collectFECData() {
  if (!FEC_API_KEY) {
    logger.error('FEC_API_KEY environment variable is required. Get one at https://api.open.fec.gov/developers/');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Start collection run
  const runResult = await pool.query(
    `INSERT INTO collection_runs (source, status) VALUES ('fec', 'running') RETURNING id`
  );
  const runId = runResult.rows[0].id;

  let totalFound = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  const errors: { message: string; candidate?: string }[] = [];

  try {
    for (const office of ['S', 'H']) {
      logger.info(`Collecting FEC ${office === 'S' ? 'Senate' : 'House'} candidates...`);

      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const { results, pages } = await fetchFECPage(office, page);
        totalPages = pages;
        totalFound += results.length;

        logger.info(`  Page ${page}/${totalPages} — ${results.length} candidates`);

        for (const fec of results) {
          try {
            const state = fec.state;
            const mappedOffice = mapOffice(fec.office);
            const district = fec.office === 'H' ? parseInt(fec.district, 10) || null : null;

            // FIX: Parameterized query for district — was SQL injection via string interpolation
            // FIX: Removed hardcoded election_date to support special elections
            const electionQuery = district !== null
              ? `SELECT id, senate_class FROM elections
                 WHERE state = $1 AND office = $2::office_type AND district = $3
                 ORDER BY election_date DESC LIMIT 1`
              : `SELECT id, senate_class FROM elections
                 WHERE state = $1 AND office = $2::office_type AND district IS NULL
                 ORDER BY election_date DESC LIMIT 1`;

            const electionParams = district !== null
              ? [state, mappedOffice, district]
              : [state, mappedOffice];

            const electionResult = await pool.query(electionQuery, electionParams);

            if (electionResult.rows.length === 0) {
              logger.warn(`  No election found for ${state} ${mappedOffice} ${district || ''}`);
              continue;
            }

            const election = electionResult.rows[0];

            // FIX: Use dedicated name parser for edge cases
            const { fullName, firstName, lastName } = parseFECName(fec.name);

            // Upsert candidate
            const upsertResult = await pool.query(
              `INSERT INTO candidates (
                election_id, full_name, first_name, last_name, party, state, office,
                district, senate_class, incumbent, status, election_type, election_date,
                fec_candidate_id, data_confidence, data_sources, last_verified
              ) VALUES (
                $1, $2, $3, $4, $5::party_affiliation, $6, $7::office_type,
                $8, $9, $10, $11::candidate_status, 'regular', '2026-11-03',
                $12, 0.85, ARRAY['fec'], NOW()
              )
              ON CONFLICT (fec_candidate_id) WHERE fec_candidate_id IS NOT NULL
              DO UPDATE SET
                status = EXCLUDED.status,
                data_confidence = GREATEST(candidates.data_confidence, 0.85),
                last_verified = NOW(),
                updated_at = NOW()
              RETURNING id, (xmax = 0) AS is_new`,
              [
                election.id,
                fullName,
                firstName,
                lastName,
                mapParty(fec.party),
                state,
                mappedOffice,
                district,
                election.senate_class || null,
                fec.incumbent_challenge === 'I',
                mapStatus(fec.candidate_status, fec.incumbent_challenge),
                fec.candidate_id,
              ]
            );

            if (upsertResult.rows[0]?.is_new) {
              totalAdded++;
            } else {
              totalUpdated++;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({ message: msg, candidate: fec.name });
            logger.warn(`  Error processing ${fec.name}: ${msg}`);
          }
        }

        page++;
        await sleep(RATE_LIMIT_MS);
      }
    }

    // Complete collection run
    await pool.query(
      `UPDATE collection_runs SET
        status = 'completed',
        records_found = $2,
        records_added = $3,
        records_updated = $4,
        errors = $5,
        completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE id = $1`,
      [runId, totalFound, totalAdded, totalUpdated, errors.length > 0 ? JSON.stringify(errors) : null]
    );

    logger.info(`✅ FEC collection complete: ${totalFound} found, ${totalAdded} added, ${totalUpdated} updated, ${errors.length} errors`);
  } catch (error) {
    await pool.query(
      `UPDATE collection_runs SET status = 'failed', errors = $2, completed_at = NOW() WHERE id = $1`,
      [runId, JSON.stringify([{ message: String(error) }])]
    );
    logger.error('FEC collection failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

collectFECData().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
