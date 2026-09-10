import { NextResponse } from "next/server";
import { runFertilizerSync } from "@/features/sync-eu-agrifood/lib/runFertilizerSync";

// NOT SCHEDULED. There was a `vercel.json` cron on this route; it was
// removed because Vercel's free (Hobby) plan clamps every function to 60s,
// and a full run here is minutes (the EU API has multi-hour degraded
// windows). Data is refreshed by hand instead:
//
//   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-agrifood.ts
//   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-agrifood.ts --backfill
//
// with DATABASE_URL pointed at the production (Neon) database.
//
// Route segment config, read by name at build time; Vercel sets the
// function timeout from it. Capped at 300 because the Hobby plan REJECTS
// the build for anything higher (it doesn't clamp). A real run here is
// minutes, so on Hobby this route can only be spot-checked, not actually
// used — the scripts above are the real path. To bring the cron back:
// Pro plan + Fluid Compute, raise this to ~800, and restore vercel.json
// with { "path": "/api/fertilizer-sync", "schedule": "0 6 * * *" }.
export const maxDuration = 300;

// This is a public URL by Next.js convention (any Route Handler is), so it's
// guarded by a shared secret rather than left open — otherwise anyone could
// repeatedly trigger a sync and burn through the EU API's rate limit.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode");

  try {
    const results = await runFertilizerSync(mode);
    return NextResponse.json({ rowsWrittenByProduct: results });
  } catch (error) {
    console.error("Sync failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 502 });
  }
}
