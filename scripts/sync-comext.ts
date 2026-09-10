/**
 * COMEXT sync, run by hand — the scheduled route (app/api/comext-refresh)
 * is disabled on Vercel's free tier (60s cap).
 *
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts             # trailing 3 years
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts --backfill  # every year from 2010, replaces the table
 *
 * Point DATABASE_URL (in .env.local) at the target database — Docker for a
 * dry run, the Neon connection string to update production. See
 * scripts/sync-agrifood.ts for what the tsx flags do. Backfill is ~12–15
 * min (COMEXT is slow); re-run it if it fails — each heading's write is one
 * idempotent transaction.
 */
import { runComextRefresh } from "@/features/sync-comext/lib/runComextRefresh";

async function main() {
  const mode = process.argv.includes("--backfill") ? "backfill" : null;
  const results = await runComextRefresh(mode);
  for (const [heading, r] of Object.entries(results)) {
    const status =
      "rowsWritten" in r
        ? `${r.rowsWritten} rows`
        : "skipped" in r
          ? "skipped (no data)"
          : `error: ${r.error}`;
    console.log(`${heading}: ${status}`);
  }
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
