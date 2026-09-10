import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PartnerImportTotal } from "@/features/globe/types";
import { buildGlobeSummary } from "@/features/globe/lib/globeSummary";
import { ImportFlowGlobe } from "@/features/globe/ui/ImportFlowGlobe";

const totals: PartnerImportTotal[] = [
  { partnerCode: "RU", partner: "Russia", tonnes: 4_200_000 },
  { partnerCode: "EG", partner: "Egypt", tonnes: 2_100_000 },
];

describe("ImportFlowGlobe", () => {
  it("renders a <canvas role=img> whose aria-label is the data summary, plus a reset control", () => {
    const html = renderToStaticMarkup(
      <ImportFlowGlobe
        totals={totals}
        activeCodes={["RU", "EG"]}
        onToggle={vi.fn()}
      />,
    );
    expect(html).toContain("<canvas");
    expect(html).toContain('role="img"');
    expect(html).toContain(buildGlobeSummary(totals, ["RU", "EG"]));
    expect(html).toContain("Reset view");
  });

  it("renders without touching browser globals during server render", () => {
    // no window/document stubs here — must not throw
    expect(() =>
      renderToStaticMarkup(
        <ImportFlowGlobe totals={totals} activeCodes={[]} onToggle={vi.fn()} />,
      ),
    ).not.toThrow();
  });
});
