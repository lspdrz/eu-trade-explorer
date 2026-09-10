import { NextResponse } from "next/server";
import { runComextRefresh } from "@/features/sync-comext/services/runComextRefresh";

// NOT SCHEDULED — same reason as app/api/fertilizer-sync/route.ts (Vercel
// free tier clamps functions to 60s; this runs minutes). Refresh by hand:
//
//   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts             # trailing 3 years
//   npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts --backfill  # every year from 2010
//
// with DATABASE_URL pointed at production. Re-enable on Pro + Fluid Compute
// by restoring vercel.json with { "path": "/api/comext-refresh",
// "schedule": "0 6 3 * *" }.
//
// Route segment config, read by name at build time. 600s: 6 COMEXT calls
// at ~45s each is ~270s, but the API has multi-hour degraded windows.
export const maxDuration = 600;

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
