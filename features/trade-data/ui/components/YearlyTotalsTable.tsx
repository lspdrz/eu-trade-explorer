import { getYearlyTonnesByPartner } from "@/features/trade-data/services/getYearlyTonnesByPartner";

// V1 scope: Ammonia only. Product selection isn't exposed yet.
const PRODUCT = "Ammonia";

// Placeholder table for verifying the pipeline — no chart yet (D3.js,
// per the stack decision). Fetches its own data rather than receiving it
// as props, so the page rendering this doesn't need to know what data it
// needs or where it comes from.
export async function YearlyTotalsTable() {
  const yearlyTotals = await getYearlyTonnesByPartner(PRODUCT);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>{PRODUCT} imports into the EU (pipeline check)</h1>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Year</th>
            <th align="left">Partner</th>
            <th align="right">Tonnes</th>
          </tr>
        </thead>
        <tbody>
          {yearlyTotals.map((row) => (
            <tr key={`${row.year}-${row.partnerCode}`}>
              <td>{row.year}</td>
              <td>{row.partner}</td>
              <td align="right">{row.tonnes.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
