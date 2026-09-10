import { NextResponse } from "next/server";
import { runComextRefresh } from "@/features/sync-comext/lib/runComextRefresh";

// NOT SCHEDULED — same reason as app/api/fertilizer-sync/route.ts (Vercel
// free tier clamps functions to 60s; this runs minutes). Refresh by hand:
//
//   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts             # trailing 3 years
//   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts --backfill  # every year from 2010
//
// with DATABASE_URL pointed at production.
//
// Route segment config, read by name at build time. Capped at 300 because
// the Hobby plan rejects the build above that (see fertilizer-sync/route.ts
// for the fuller note). A trailing-3-year run is ~270s of COMEXT calls plus
// the API's multi-hour degraded windows, so this route is only a
// spot-check on Hobby — scripts/sync-comext.ts is the real path. Re-enable
// the cron on Pro + Fluid Compute: raise this to ~600 and restore
// vercel.json with { "path": "/api/comext-refresh", "schedule": "0 6 3 * *" }.
export const maxDuration = 300;

// Public URL by Next.js convention — guarded by a shared secret so it
// can't be triggered at will (the COMEXT API is slow and rate-limited).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode");

  try {
    return NextResponse.json(await runComextRefresh(mode));
  } catch (error) {
    console.error("COMEXT refresh failed", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 502 });
  }
}
