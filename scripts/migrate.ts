/**
 * migrate.ts — Run database migrations in order.
 * Usage: npx tsx scripts/migrate.ts
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'database', 'migrations');

async function migrate() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('🔗 Connected to database');

  // Track applied migrations
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows: applied } = await client.query('SELECT name FROM _migrations ORDER BY id');
  const appliedSet = new Set(applied.map((r: { name: string }) => r.name));

  // Read migration files
  const files = (await readdir(MIGRATIONS_DIR))
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  ✅ ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`  🔄 Applying ${file}...`);

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      ran++;
      console.log(`  ✅ ${file} applied`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ❌ ${file} failed:`, err);
      process.exit(1);
    }
  }

  console.log(`\n🏁 Migrations complete. ${ran} applied, ${files.length - ran} skipped.`);
  await client.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
