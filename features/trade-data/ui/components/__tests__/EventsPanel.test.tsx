import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartEvent } from "@/features/trade-data/types";

const state: {
  enabled: boolean;
  events: ChartEvent[];
  setEnabled: ReturnType<typeof vi.fn>;
  addEvent: ReturnType<typeof vi.fn>;
  updateEvent: ReturnType<typeof vi.fn>;
  removeEvent: ReturnType<typeof vi.fn>;
} = {
  enabled: false,
  events: [],
  setEnabled: vi.fn(),
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  removeEvent: vi.fn(),
};

vi.mock("@/features/trade-data/ui/hooks/useChartEvents", () => ({ useChartEvents: () => state }));

import { EventsPanel } from "@/features/trade-data/ui/components/EventsPanel";

beforeEach(() => {
  state.enabled = false;
  state.events = [];
});

describe("EventsPanel", () => {
  it("renders the master switch and the empty state when there are no events", () => {
    const html = renderToStaticMarkup(<EventsPanel />);
    expect(html).toContain("Show on chart");
    expect(html).toContain("No events yet");
  });

  it("renders a row per event with its date and label", () => {
    state.events = [
      { id: "a", year: 2022, month: 3, label: "Russia invades Ukraine" },
      { id: "b", year: 2022, month: 12, label: "EU gas price cap" },
    ];
    const html = renderToStaticMarkup(<EventsPanel />);
    expect(html).toContain("Mar 2022");
    expect(html).toContain("Russia invades Ukraine");
    expect(html).toContain("Dec 2022");
    expect(html).toContain("EU gas price cap");
    expect(html).not.toContain("No events yet");
  });

  it("disables the add button at the cap", () => {
    state.events = Array.from({ length: 20 }, (_, i) => ({
      id: `e${i}`,
      year: 2000 + i,
      month: 1,
      label: `e${i}`,
    }));
    const html = renderToStaticMarkup(<EventsPanel />);
    expect(html).toMatch(/Remove one to add another|disabled/);
  });
});
