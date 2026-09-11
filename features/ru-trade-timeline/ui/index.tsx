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
  return <RuTimelineControls initialData={initialData} />;
}
