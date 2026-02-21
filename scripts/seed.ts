/**
 * seed.ts — Populate database with initial reference data.
 * Usage: npx tsx scripts/seed.ts
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

const SEEDS_DIR = join(import.meta.dirname, '..', 'database', 'seeds');

// Ordered list — dependencies first
const SEED_FILES = [
  'states.sql',
  '2026_elections.sql',
  'senate_classes.sql',  // Class III special elections (if any)
];

async function seed() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('🔗 Connected to database');

  for (const file of SEED_FILES) {
    const sql = await readFile(join(SEEDS_DIR, file), 'utf-8');
    console.log(`  🌱 Seeding ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✅ ${file} done`);
    } catch (err) {
      console.error(`  ❌ ${file} failed:`, err);
      process.exit(1);
    }
  }

  // Generate House election records from state house_seats counts
  console.log('  🌱 Generating House election records...');
  const { rows: states } = await client.query(
    'SELECT code, house_seats FROM states WHERE house_seats > 0'
  );

  let houseCount = 0;
  for (const state of states) {
    for (let d = 1; d <= state.house_seats; d++) {
      const district = String(d).padStart(2, '0');
      await client.query(
        `INSERT INTO elections (state, office, district, election_type, election_date)
         VALUES ($1, 'house', $2, 'regular', '2026-11-03')
         ON CONFLICT DO NOTHING`,
        [state.code, parseInt(district)]
      );
      houseCount++;
    }
  }
  console.log(`  ✅ ${houseCount} House elections generated`);

  // Verify senate_class assignments
  console.log('  🔍 Verifying senate_class assignments...');
  const senateCheck = await client.query(
    `SELECT senate_class, election_type, COUNT(*) as cnt
     FROM elections WHERE office = 'senate'
     GROUP BY senate_class, election_type
     ORDER BY senate_class`
  );
  for (const row of senateCheck.rows) {
    console.log(`     Class ${row.senate_class} (${row.election_type}): ${row.cnt} seats`);
  }

  // Sanity check: Class II regular should be exactly 33 for 2026
  const classII = senateCheck.rows.find(
    (r: { senate_class: number; election_type: string }) =>
      r.senate_class === 2 && r.election_type === 'regular'
  );
  if (!classII || parseInt(classII.cnt) !== 33) {
    console.warn(`  ⚠️  WARNING: Expected 33 Class II regular seats, found ${classII?.cnt ?? 0}`);
  } else {
    console.log('  ✅ Senate class verification passed (33 Class II seats)');
  }

  // Sanity check: House elections should have NULL senate_class
  const badHouse = await client.query(
    `SELECT COUNT(*) as cnt FROM elections WHERE office = 'house' AND senate_class IS NOT NULL`
  );
  if (parseInt(badHouse.rows[0].cnt) > 0) {
    console.warn(`  ⚠️  WARNING: ${badHouse.rows[0].cnt} House elections have non-NULL senate_class`);
  }

  console.log('\n🏁 Seeding complete.');
  await client.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
