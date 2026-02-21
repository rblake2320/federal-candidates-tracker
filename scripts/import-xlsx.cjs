/**
 * Import candidates from the Excel workbook into PostgreSQL.
 * Usage: node scripts/import-xlsx.cjs [path-to-xlsx]
 */
const XLSX = require('xlsx');
const { Client } = require('pg');

const XLSX_PATH = process.argv[2] || 'C:/Users/techai/OneDrive/Desktop/federal_congressional_candidates_through_2026.xlsx';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:Tracker2026!@localhost:5432/federal_candidates';

// Map party names from FEC to our enum
const PARTY_MAP = {
  'democratic party': 'democratic',
  'republican party': 'republican',
  'libertarian party': 'libertarian',
  'green party': 'green',
  'constitution party': 'constitution',
  'independent': 'independent',
  'no party affiliation': 'no_party',
};

function mapParty(raw) {
  if (!raw) return 'other';
  const lower = raw.trim().toLowerCase();
  return PARTY_MAP[lower] || 'other';
}

function mapOffice(raw) {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower.includes('senate')) return 'senate';
  if (lower.includes('house')) return 'house';
  return null;
}

function mapStatus(raw) {
  if (!raw) return 'filed';
  const lower = raw.trim().toLowerCase();
  if (lower.includes('incumbent')) return 'filed';
  if (lower.includes('challenger')) return 'filed';
  return 'filed';
}

function parseDistrict(raw, office) {
  if (office !== 'house') return null;
  if (!raw) return null;
  const s = String(raw).trim();
  // Extract number from strings like "7", "District 7", "At-large"
  const m = s.match(/(\d+)/);
  if (m) return parseInt(m[1], 10);
  if (s.toLowerCase().includes('at-large') || s === '0') return 0;
  return null;
}

function parseSenateClass(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (s.includes('class ii') || s.includes('class 2')) return 2;
  if (s.includes('class iii') || s.includes('class 3')) return 3;
  if (s.includes('class i') || s.includes('class 1')) return 1;
  return null;
}

function parseName(raw) {
  if (!raw) return { first: '', last: '', full: '' };
  const s = raw.trim();
  // FEC format: "LAST, FIRST MIDDLE"
  const parts = s.split(',');
  if (parts.length >= 2) {
    const last = parts[0].trim();
    const first = parts.slice(1).join(',').trim();
    // Title case
    const tc = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    const firstTc = first.split(/\s+/).map(tc).join(' ');
    const lastTc = last.split(/[\s-]+/).map(tc).join(last.includes('-') ? '-' : ' ');
    return { first: firstTc, last: lastTc, full: `${firstTc} ${lastTc}` };
  }
  return { first: '', last: '', full: s };
}

function isIncumbent(raw) {
  if (!raw) return false;
  return raw.trim().toLowerCase().includes('incumbent');
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets['All (Special+Regular)'];
  const data = XLSX.utils.sheet_to_json(ws);

  console.log(`Read ${data.length} candidates from Excel`);

  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Connected to database');

  // Get election lookup: state+office+district -> election_id
  const { rows: elections } = await client.query('SELECT id, state, office, district, senate_class, election_type FROM elections');
  const electionMap = new Map();
  for (const e of elections) {
    // Key: state|office|district (district null for senate)
    const key = `${e.state.trim()}|${e.office}|${e.district || 'null'}`;
    electionMap.set(key, e.id);
  }

  // State code lookup
  const { rows: states } = await client.query('SELECT code FROM states');
  const validStates = new Set(states.map(s => s.code.trim()));

  let imported = 0, skipped = 0, errors = 0;

  for (const row of data) {
    try {
      const office = mapOffice(row['Office Sought']);
      if (!office) { skipped++; continue; }

      const state = (row['State'] || '').trim().toUpperCase();
      // Map full state names to codes
      const stateCode = state.length === 2 ? state : null;
      if (!stateCode || !validStates.has(stateCode)) { skipped++; continue; }

      const party = mapParty(row['Party Affiliation']);
      const district = parseDistrict(row['District/Class'], office);
      const senateClass = office === 'senate' ? parseSenateClass(row['District/Class']) : null;
      const { first, last, full } = parseName(row['Full Name']);
      const fecId = (row['FEC Candidate ID'] || '').trim() || null;
      const incumbent = isIncumbent(row['Incumbent or Challenger']);
      const electionType = (row['Election Type'] || '').toLowerCase().includes('special') ? 'special' : 'regular';

      // Find matching election
      const eKey = `${stateCode}|${office}|${office === 'house' ? district : 'null'}`;
      let electionId = electionMap.get(eKey);

      // If no election found, create one for special elections
      if (!electionId && electionType === 'special') {
        const elDate = row['Election Date'] ? new Date(row['Election Date']).toISOString().split('T')[0] : '2026-11-03';
        const res = await client.query(
          `INSERT INTO elections (state, office, district, senate_class, election_type, election_date)
           VALUES ($1, $2, $3, $4, 'special', $5)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [stateCode, office, district, senateClass, elDate]
        );
        if (res.rows.length > 0) {
          electionId = res.rows[0].id;
          electionMap.set(eKey + '|special', electionId);
        }
      }

      // Parse election date from Excel or default to 2026-11-03
      let electionDate = '2026-11-03';
      if (row['Election Date']) {
        const d = new Date(row['Election Date']);
        if (!isNaN(d.getTime())) {
          electionDate = d.toISOString().split('T')[0];
        }
      }

      // If still no election found for regular elections, try to create one
      if (!electionId) {
        const res = await client.query(
          `INSERT INTO elections (state, office, district, senate_class, election_type, election_date)
           VALUES ($1, $2, $3, $4, $5::election_type, $6)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [stateCode, office, district, senateClass, electionType, electionDate]
        );
        if (res.rows.length > 0) {
          electionId = res.rows[0].id;
          electionMap.set(eKey, electionId);
        } else {
          // ON CONFLICT returned nothing, try to find existing
          const lookup = await client.query(
            `SELECT id FROM elections WHERE state = $1 AND office = $2 AND COALESCE(district, -1) = COALESCE($3, -1) LIMIT 1`,
            [stateCode, office, district]
          );
          if (lookup.rows.length > 0) {
            electionId = lookup.rows[0].id;
            electionMap.set(eKey, electionId);
          }
        }
      }

      if (!electionId) {
        skipped++;
        if (skipped <= 10) console.log(`No election for: ${full} (${stateCode} ${office} dist:${district})`);
        continue;
      }

      // Insert candidate
      await client.query(
        `INSERT INTO candidates (
          first_name, last_name, full_name, party, state, office,
          district, senate_class, incumbent, status, election_id,
          fec_candidate_id, data_confidence, election_date, election_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (fec_candidate_id) WHERE fec_candidate_id IS NOT NULL
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          party = EXCLUDED.party,
          status = EXCLUDED.status,
          election_date = EXCLUDED.election_date,
          updated_at = NOW()`,
        [first, last, full, party, stateCode, office,
         district, senateClass, incumbent, 'filed', electionId,
         fecId, 0.8, electionDate, electionType]
      );
      imported++;
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`Error on row:`, row['Full Name'], err.message);
    }
  }

  // Update election candidate counts
  await client.query(`
    UPDATE elections e SET total_candidates = (
      SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id
    )
  `);

  console.log(`\nImport complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

  // Verify
  const { rows: [count] } = await client.query('SELECT COUNT(*) FROM candidates');
  const { rows: [parties] } = await client.query('SELECT party, COUNT(*) as cnt FROM candidates GROUP BY party ORDER BY cnt DESC');
  console.log(`Total candidates in DB: ${count.count}`);

  await client.end();
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
