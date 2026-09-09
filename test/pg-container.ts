import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Vitest globalSetup for the "integration" project. One throwaway Postgres
 * per `vitest run`: started, migrated once with the real migration files,
 * shared by the (serial) integration test files, stopped on teardown.
 *
 * The container URL reaches the test workers through process.env — Vitest
 * forks workers after globalSetup, and they inherit it. lib/db/client reads
 * DATABASE_URL, so nothing else changes. VITEST_PG_CONTAINER is the marker
 * test/integration-db.ts checks so a misconfigured run fails loudly instead
 * of touching a real database.
 */
export default async function setup() {
  const container = await new PostgreSqlContainer("postgres:17").start();
  const url = container.getConnectionUri();

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
    const { rows } = await pool.query(
      "select count(*)::int n from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'",
    );
    if (rows[0].n === 0) throw new Error("migrations produced no tables");
  } finally {
    await pool.end();
  }

  process.env.DATABASE_URL = url;
  process.env.VITEST_PG_CONTAINER = "1";

  return async () => {
    await container.stop();
  };
}
