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
        `INSERT INTO elections (state, office, district, election_type, election_date, status)
         VALUES ($1, 'house', $2, 'general', '2026-11-03', 'upcoming')
         ON CONFLICT DO NOTHING`,
        [state.code, district]
      );
      houseCount++;
    }
  }
  console.log(`  ✅ ${houseCount} House elections generated`);

  console.log('\n🏁 Seeding complete.');
  await client.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
