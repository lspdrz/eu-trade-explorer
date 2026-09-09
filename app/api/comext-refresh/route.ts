import { NextResponse } from "next/server";
import { runComextRefresh } from "@/features/sync-comext/services/runComextRefresh";

// Route segment config (Vercel reads this by name at build time — same
// mechanism as app/page.tsx's `dynamic`). 600s: 6 COMEXT calls at ~45s
// each is ~270s, but the API has documented multi-hour degraded windows
// that push individual calls to minutes.
export const maxDuration = 600;

// Public URL by Next.js convention — guarded by a shared secret so it
// can't be triggered at will (the COMEXT API is slow and rate-limited).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runComextRefresh());
  } catch (error) {
    console.error("COMEXT refresh failed", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 502 });
  }
}
