import type { SelectedSeries } from "@/features/trade-data/types";

/**
 * The swatch list under a chart. Identity is never colour-alone — every
 * chart with a series renders this, single series included.
 */
export function ChartLegend({ items }: { items: SelectedSeries[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
      {items.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.name}
        </li>
      ))}
    </ul>
  );
}
