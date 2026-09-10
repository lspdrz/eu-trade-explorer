import { format } from "d3-format";
import type { GroupedSeries, SelectedSeries } from "@/features/trade-data/types";

const formatInt = format(",");

/**
 * The numbers behind the chart — a `<details>` the reader opens on demand.
 * The accessible, no-JS representation of the same `GroupedSeries` the bar
 * chart draws. `seriesLabel` is the first column's header ("Country",
 * "Product") — plain copy, chosen by the caller.
 */
export function ImportsDataTable({
  series,
  seriesMeta,
  seriesLabel,
  partialYear,
}: {
  series: GroupedSeries;
  seriesMeta: SelectedSeries[];
  seriesLabel: string;
  partialYear?: number;
}) {
  return (
    <details className="mt-5 text-sm">
      <summary className="cursor-pointer text-muted select-none marker:text-border hover:text-foreground">
        Show the numbers
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem] tabular-nums">
          <caption className="sr-only">
            Imported tonnes per year by {seriesLabel.toLowerCase()}
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th scope="col" className="py-1.5 pr-4 font-medium">
                {seriesLabel}
              </th>
              {series.years.map((year) => (
                <th key={year} scope="col" className="px-2 py-1.5 text-right font-medium">
                  {year}
                  {year === partialYear ? "*" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seriesMeta.map((s) => (
              <tr key={s.key} className="border-b border-border/60">
                <th scope="row" className="py-1.5 pr-4 text-left font-normal">
                  {s.name}
                </th>
                {series.years.map((year) => {
                  const point = series.points.find(
                    (p) => p.seriesKey === s.key && p.year === year,
                  );
                  return (
                    <td key={year} className="px-2 py-1.5 text-right">
                      {formatInt(Math.round(point?.tonnes ?? 0))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
