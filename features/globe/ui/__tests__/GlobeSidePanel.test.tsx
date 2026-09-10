import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PartnerImportTotal } from "@/features/globe/types";
import { GlobeSidePanel } from "@/features/globe/ui/GlobeSidePanel";

const t = (
  partnerCode: string,
  partner: string,
  tonnes: number,
): PartnerImportTotal => ({ partnerCode, partner, tonnes });
const totals = [
  t("RU", "Russia", 4_200_000),
  t("EG", "Egypt", 2_100_000),
  t("TT", "Trinidad and Tobago", 1_800_000),
  t("MA", "Morocco", 400_000),
];
const base = {
  totals,
  onToggle: vi.fn(),
  onReset: vi.fn(),
  mappedCodes: new Set(["RU", "EG", "MA"]),
};

describe("GlobeSidePanel", () => {
  it("lists the active countries, tonnage-ordered, with a rank and a remove control", () => {
    const html = renderToStaticMarkup(
      <GlobeSidePanel {...base} activeCodes={["EG", "RU"]} />,
    );
    expect(html).toContain("Showing 2 origins");
    expect(html.indexOf("Russia")).toBeLessThan(html.indexOf("Egypt"));
    expect(html).toContain("Remove Russia");
    expect(html).toContain("#1");
  });

  it("tags an active country that has no polygon", () => {
    const html = renderToStaticMarkup(
      <GlobeSidePanel {...base} activeCodes={["TT"]} />,
    );
    expect(html).toContain("Trinidad and Tobago");
    expect(html).toContain("not on map");
  });

  it("shows 'Reset to top 10' only when the active set differs from the default top-N", () => {
    const dflt = renderToStaticMarkup(
      <GlobeSidePanel {...base} activeCodes={["RU", "EG", "TT", "MA"]} />,
    );
    // default top-N here is the 4 totals in order → no reset button
    expect(dflt).not.toContain("Reset to top");
    const custom = renderToStaticMarkup(
      <GlobeSidePanel {...base} activeCodes={["RU"]} />,
    );
    expect(custom).toContain("Reset to top 10");
  });

  it("shows an empty-data message when there are no totals", () => {
    const html = renderToStaticMarkup(
      <GlobeSidePanel
        totals={[]}
        activeCodes={[]}
        mappedCodes={new Set()}
        onToggle={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(html).toContain("No import data yet");
  });
});
