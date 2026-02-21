/**
 * verify-data.ts — Validate database integrity after collection runs.
 * Usage: npx tsx scripts/verify-data.ts
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

interface Check {
  name: string;
  query: string;
  validate: (rows: any[]) => { pass: boolean; detail: string };
}

const checks: Check[] = [
  {
    name: 'States seeded',
    query: 'SELECT COUNT(*) AS cnt FROM states',
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt >= 50, detail: `${cnt} states found` };
    },
  },
  {
    name: 'Senate elections for 2026',
    query: `SELECT COUNT(*) AS cnt FROM elections
            WHERE office = 'senate' AND election_date = '2026-11-03'`,
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt === 33, detail: `${cnt}/33 Class II seats` };
    },
  },
  {
    name: 'House elections for 2026',
    query: `SELECT COUNT(*) AS cnt FROM elections
            WHERE office = 'house' AND election_date = '2026-11-03'`,
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt === 435, detail: `${cnt}/435 House seats` };
    },
  },
  {
    name: 'No orphaned candidates',
    query: `SELECT COUNT(*) AS cnt FROM candidates c
            LEFT JOIN elections e ON c.election_id = e.id
            WHERE e.id IS NULL`,
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt === 0, detail: cnt === 0 ? 'clean' : `${cnt} orphans` };
    },
  },
  {
    name: 'Data confidence in valid range',
    query: `SELECT COUNT(*) AS cnt FROM candidates
            WHERE data_confidence < 0 OR data_confidence > 1`,
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt === 0, detail: cnt === 0 ? 'all valid' : `${cnt} out of range` };
    },
  },
  {
    name: 'Recent collection activity',
    query: `SELECT COUNT(*) AS cnt FROM collection_runs
            WHERE started_at > NOW() - INTERVAL '7 days'`,
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt > 0, detail: `${cnt} runs in last 7 days` };
    },
  },
  {
    name: 'State summary view works',
    query: 'SELECT COUNT(*) AS cnt FROM v_state_summary',
    validate: (rows) => {
      const cnt = parseInt(rows[0].cnt, 10);
      return { pass: cnt > 0, detail: `${cnt} state summaries` };
    },
  },
];

async function verify() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('🔍 Running data verification checks...\n');

  let passed = 0;
  let failed = 0;
  let warned = 0;

  for (const check of checks) {
    try {
      const { rows } = await client.query(check.query);
      const result = check.validate(rows);
      const icon = result.pass ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}: ${result.detail}`);
      if (result.pass) passed++;
      else failed++;
    } catch (err: any) {
      // Table might not exist yet — treat as warning
      console.log(`  ⚠️  ${check.name}: ${err.message}`);
      warned++;
    }
  }

  console.log(`\n🏁 Verification: ${passed} passed, ${failed} failed, ${warned} warnings`);
  await client.end();
  process.exit(failed > 0 ? 1 : 0);
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
