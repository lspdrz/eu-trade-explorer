import { getRuTradeTimelineData } from "@/features/ru-trade-timeline/lib/getRuTradeTimelineData";
import { RuTimelineControls } from "@/features/ru-trade-timeline/ui/components/RuTimelineControls";

/**
 * The feature's entry point. A plain (non-force-dynamic) Server Component —
 * Next statically renders it at `next build` time, so the base page load
 * never queries Postgres per-visitor. Only RuTimelineControls's picker
 * interaction (selecting a chapter beyond the 5 defaults here) touches the
 * database at runtime, via its Server Action.
 */
export async function RuTradeTimeline() {
  const initialData = await getRuTradeTimelineData();
  return (
    <main className="mx-auto max-w-[90rem] px-6 pt-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-semibold">Russian fertiliser imports, 2010–2025</h1>
      <p className="mt-2 text-muted">
        While most EU imports from Russia collapsed after the 2022 invasion,
        fertiliser did not follow the same trend.
      </p>
      <div className="mt-6">
        <RuTimelineControls initialData={initialData} />
      </div>
    </main>
  );
}
