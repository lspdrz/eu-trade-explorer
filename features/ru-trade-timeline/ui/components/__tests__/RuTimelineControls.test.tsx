import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RuTimelineData } from "@/features/ru-trade-timeline/types";

vi.mock("@/features/ru-trade-timeline/lib/fetchChapterSeries", () => ({
  fetchChapterSeries: vi.fn(),
}));

import { RuTimelineControls } from "@/features/ru-trade-timeline/ui/components/RuTimelineControls";

const initialData: RuTimelineData = {
  years: [2020, 2021, 2022, 2023],
  series: [
    { key: "fertiliser", label: "Fertiliser", values: [100, 120, 90, 200] },
    { key: "27", label: "Mineral fuels, mineral oils and products of their distillation; Bituminous substances; Mineral waxes", values: [900, 800, 300, 250] },
  ],
};

describe("RuTimelineControls", () => {
  it("renders the picker and the chart from the initial data without touching browser globals", () => {
    expect(() =>
      renderToStaticMarkup(<RuTimelineControls initialData={initialData} />),
    ).not.toThrow();
  });

  it("renders the picker's button and the chart's legend", () => {
    const html = renderToStaticMarkup(<RuTimelineControls initialData={initialData} />);
    expect(html).toContain("Fertiliser");
    expect(html).toContain("<svg");
  });
});
