import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";
import { db } from "@/lib/db/client";

// Fail loudly rather than ever touching a real database — this is the exact
// footgun that motivated the whole change.
if (
  !process.env.VITEST_PG_CONTAINER ||
  /eu_trade_explorer/.test(process.env.DATABASE_URL ?? "")
) {
  throw new Error(
    "Integration tests must run against the throwaway container (see " +
      "test/pg-container.ts), not a real database. DATABASE_URL=" +
      (process.env.DATABASE_URL ?? "<unset>"),
  );
}

// Every public table except Drizzle's migration bookkeeping — dynamic, so a
// table added later needs no change here.
beforeEach(async () => {
  const { rows } = await db.execute(sql`
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> '__drizzle_migrations'
  `);
  if (rows.length === 0) return;
  const tables = (rows as { tablename: string }[])
    .map((r) => `"${r.tablename}"`)
    .join(", ");
  await db.execute(sql.raw(`truncate table ${tables} restart identity cascade`));
});
