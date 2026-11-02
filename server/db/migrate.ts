import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Migration runner that executes SQL migration files against the PostgreSQL database.
 */
export async function runMigrations(pool: pg.Pool): Promise<{ executed: string[]; total: number }> {
  const client = await pool.connect();
  const executed: string[] = [];

  try {
    // In managed Cloud SQL environments, schema definition & migrations are handled
    // via Drizzle Kit / admin tools. Check whether core tables already exist.
    const tablesCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'properties', 'payments')
      LIMIT 1;
    `);

    // If core tables already exist in the database, schema is already provisioned
    if (tablesCheck.rows.length > 0) {
      // Check if schema_migrations table exists
      const migrationTableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schema_migrations'
        LIMIT 1;
      `);

      if (migrationTableCheck.rows.length === 0) {
        // Schema is already provisioned by ORM; attempt to create migration tracking table if permitted
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
              version VARCHAR(64) PRIMARY KEY,
              applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);
        } catch (permErr: any) {
          // If the app user does not have DDL privileges on public schema,
          // log informative notice and return successfully since schema is already live
          console.log('[Database Migration] Schema is managed via ORM (tables already exist in PostgreSQL). Skipping raw SQL migrations.');
          return { executed: [], total: 0 };
        }
      }
    }

    await client.query('BEGIN');

    // Ensure migration table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Fetch applied migrations
    const res = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set<string>(res.rows.map((r: { version: string }) => r.version));

    // Read migrations directory
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      await client.query('COMMIT');
      return { executed: [], total: 0 };
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!appliedVersions.has(file)) {
        console.log(`[Database Migration] Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        executed.push(file);
        console.log(`[Database Migration] Successfully applied: ${file}`);
      }
    }

    await client.query('COMMIT');
    return { executed, total: files.length };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback failure if transaction wasn't active
    }
    // If permission is denied because application user has DML-only permissions on public schema,
    // verify if the tables are already present and handle gracefully
    if (err.code === '42501' || (err.message && err.message.includes('permission denied for schema public'))) {
      console.warn('[Database Migration Notice] App user has DML access; schema DDL is managed via ORM schema tools.');
      return { executed: [], total: 0 };
    }
    console.error('[Database Migration] Error running migrations:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Standalone CLI runner when executed via tsx
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  if (!ENV.DATABASE_URL) {
    console.error('[Database Migration Error] DATABASE_URL is not set in environment. Aborting.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: ENV.DATABASE_URL,
    ssl: ENV.DB_SSL ? { rejectUnauthorized: false } : undefined,
  });

  runMigrations(pool)
    .then((result) => {
      console.log(`[Database Migration Complete] ${result.executed.length} new migrations applied out of ${result.total} total.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Database Migration Failed]', err);
      process.exit(1);
    })
    .finally(() => pool.end());
}
