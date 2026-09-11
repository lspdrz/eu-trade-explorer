import timelineData from "@/features/ru-trade-timeline/data/ru-trade-timeline.json";
import { RuTimelineChart } from "@/features/ru-trade-timeline/ui/RuTimelineChart";

/**
 * The feature's entry point. Reads the checked-in static JSON via a plain
 * TypeScript import (resolveJsonModule is on) — no DB query, no fetch. This
 * is a fixed historical dataset (see the design doc), so a build-time
 * import is enough; regenerate the JSON (scripts/build-ru-trade-timeline-json.ts)
 * and redeploy if the underlying data or the comparison series change.
 */
export function RuTradeTimeline() {
  return (
    <RuTimelineChart
      years={timelineData.years}
      series={timelineData.series}
      highlightKey="fertiliser"
      markerYear={2022}
      markerMonth={2}
      markerLabel="Russia invades Ukraine"
    />
  );
}
