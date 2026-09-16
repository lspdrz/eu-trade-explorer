import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PartnerImportTotal } from "@/features/globe/types";

let requested: string[] = [];
const setRequested = vi.fn();
vi.mock("@/features/globe/ui/hooks/useGlobeSelection", () => ({
  useGlobeSelection: () => ({ requested, setRequested }),
}));

// Stub the canvas child — its effects/canvas aren't under test here.
vi.mock("@/features/globe/ui/ImportFlowGlobe", () => ({
  ImportFlowGlobe: ({ activeCodes }: { activeCodes: string[] }) => (
    <div data-testid="globe">{activeCodes.join(",")}</div>
  ),
}));

import { GlobeView } from "@/features/globe/ui/GlobeView";

const totals: PartnerImportTotal[] = [
  { partnerCode: "RU", partner: "Russia", tonnes: 100 },
  { partnerCode: "EG", partner: "Egypt", tonnes: 90 },
  { partnerCode: "DZ", partner: "Algeria", tonnes: 80 },
];

describe("GlobeView", () => {
  it("with no requested countries, shows the resolved top-N in both panes", () => {
    requested = [];
    const html = renderToStaticMarkup(<GlobeView totals={totals} />);
    expect(html).toContain("RU,EG,DZ"); // stubbed globe prints activeCodes
    expect(html).toContain("Showing 3 origins");
  });

  it("uses the requested set as the active set", () => {
    requested = ["EG", "RU"];
    const html = renderToStaticMarkup(<GlobeView totals={totals} />);
    expect(html).toContain("EG,RU");
    expect(html).toContain("Showing 2 origins");
  });
});
