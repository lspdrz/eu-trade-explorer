/**
 * EU agrifood (surveillance) sync, run by hand — the scheduled route
 * (app/api/fertilizer-sync) is disabled on Vercel's free tier (60s cap).
 *
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-agrifood.ts             # current marketing year
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-agrifood.ts --backfill  # full history (per product, one-time)
 *
 * Point DATABASE_URL (in .env.local) at the target database — the local
 * Docker one for a dry run, the Neon connection string to update
 * production. `--conditions=react-server` resolves the `server-only`
 * imports to their no-op; `--env-file` loads DATABASE_URL before the
 * module graph (lib/db/client reads process.env at import time).
 */
import { runFertilizerSync } from "@/features/sync-eu-agrifood/services/runFertilizerSync";

async function main() {
  const mode = process.argv.includes("--backfill") ? "backfill" : null;
  const results = await runFertilizerSync(mode);
  for (const [product, r] of Object.entries(results)) {
    console.log(`${product}: ${r.skipped ? "skipped (no data)" : `${r.rowsWritten} rows`}`);
  }
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
