import type { SelectedSeries, StackedSeries } from "../../types";
import { formatInt } from "../../lib/chartFormat";

/**
 * The numbers behind the stacked chart — a <details> the reader opens on
 * demand. One row per (country, product), grouped by country, with a Total
 * row per country (the stack height). The accessible, no-JS twin of the
 * chart.
 */
export function StackedImportsDataTable({
  series,
  seriesMeta,
  nameForCountry,
  partialYear,
}: {
  series: StackedSeries;
  seriesMeta: SelectedSeries[];
  nameForCountry: (code: string) => string;
  partialYear?: number;
}) {
  const cellAt = (year: number, partnerCode: string) =>
    series.cells.find((c) => c.year === year && c.partnerCode === partnerCode);

  return (
    <details className="mt-5 text-sm">
      <summary className="cursor-pointer text-muted select-none marker:text-border hover:text-foreground">
        Show the numbers
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem] tabular-nums">
          <caption className="sr-only">
            Imported tonnes per year by partner country and product
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th scope="col" className="py-1.5 pr-4 font-medium">
                Country
              </th>
              <th scope="col" className="py-1.5 pr-4 font-medium">
                Product
              </th>
              {series.years.map((year) => (
                <th
                  key={year}
                  scope="col"
                  className="px-2 py-1.5 text-right font-medium"
                >
                  {year}
                  {year === partialYear ? "*" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.partnerCodes.flatMap((partnerCode) => {
              const country = nameForCountry(partnerCode);
              const productRows = seriesMeta.map((s) => (
                <tr
                  key={`${partnerCode}-${s.key}`}
                  className="border-b border-border/60"
                >
                  <th
                    scope="row"
                    className="py-1.5 pr-4 text-left font-normal"
                  >
                    {country}
                  </th>
                  <td className="py-1.5 pr-4">{s.name}</td>
                  {series.years.map((year) => {
                    const seg = cellAt(year, partnerCode)?.segments.find(
                      (g) => g.product === s.key,
                    );
                    return (
                      <td key={year} className="px-2 py-1.5 text-right">
                        {formatInt(Math.round(seg?.tonnes ?? 0))}
                      </td>
                    );
                  })}
                </tr>
              ));
              const totalRow = (
                <tr
                  key={`${partnerCode}-total`}
                  className="border-b border-border font-medium"
                >
                  <th scope="row" className="py-1.5 pr-4 text-left">
                    {country}
                  </th>
                  <td className="py-1.5 pr-4">Total</td>
                  {series.years.map((year) => (
                    <td key={year} className="px-2 py-1.5 text-right">
                      {formatInt(Math.round(cellAt(year, partnerCode)?.total ?? 0))}
                    </td>
                  ))}
                </tr>
              );
              return [...productRows, totalRow];
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
