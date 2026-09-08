import { NextResponse } from "next/server";
import { runFertilizerSync } from "@/features/sync-eu-agrifood/services/runFertilizerSync";

// Route segment config, not a normal export — Next.js reads this by name
// at build time and Vercel uses it to set this function's actual timeout
// on deploy; nothing in this codebase calls it directly (same mechanism
// as app/page.tsx's `dynamic = "force-dynamic"`). 800s because a full
// history backfill (?mode=backfill) has measured at 5.5+ minutes against
// this API, well over Vercel's default.
export const maxDuration = 800;

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
