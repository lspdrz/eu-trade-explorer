import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.local.example to .env.local and " +
      "fill in a connection string (local Docker Postgres, or Neon in " +
      "production).",
  );
}

/**
 * Shared Drizzle/Postgres connection — domain-agnostic infra, not where
 * queries live (see each feature's `db/` for those).
 *
 * Uses the standard `pg` driver, not Neon's HTTP one: Neon's HTTP driver
 * speaks a Neon-specific proxy protocol and can't reach a plain local
 * Postgres, meaning two code paths for local Docker vs. production Neon.
 * `pg` speaks real Postgres wire protocol and works identically against
 * both, since Neon also supports normal TCP connections.
 */
const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool });
