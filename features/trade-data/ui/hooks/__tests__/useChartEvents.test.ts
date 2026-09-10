import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventStore } from "../useChartEvents";

function fakeStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  eventStore.__resetForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("eventStore", () => {
  it("starts empty and disabled", () => {
    expect(eventStore.getSnapshot()).toEqual({ v: 1, enabled: false, events: [] });
  });

  it("adds an event, sorted, with an id, and persists it", () => {
    eventStore.addEvent({ year: 2024, month: 3, label: "  Later  " });
    eventStore.addEvent({ year: 2022, month: 2, label: "Earlier" });
    const snap = eventStore.getSnapshot();
    expect(snap.events.map((e) => e.label)).toEqual(["Earlier", "Later"]);
    expect(snap.events[0].id).toEqual(expect.any(String));
    expect(
      JSON.parse(localStorage.getItem("chart-events")!).events,
    ).toHaveLength(2);
  });

  it("returns a stable snapshot identity between writes", () => {
    eventStore.addEvent({ year: 2022, month: 1, label: "x" });
    expect(eventStore.getSnapshot()).toBe(eventStore.getSnapshot());
  });

  it("setEnabled flips the flag without touching events", () => {
    eventStore.addEvent({ year: 2022, month: 1, label: "x" });
    eventStore.setEnabled(true);
    expect(eventStore.getSnapshot().enabled).toBe(true);
    expect(eventStore.getSnapshot().events).toHaveLength(1);
  });

  it("updateEvent merges, re-validates, re-sorts; ignores an invalid patch", () => {
    eventStore.addEvent({ year: 2022, month: 6, label: "x" });
    const id = eventStore.getSnapshot().events[0].id;
    eventStore.updateEvent(id, { year: 2019 });
    expect(eventStore.getSnapshot().events[0].year).toBe(2019);
    eventStore.updateEvent(id, { month: 99 });
    expect(eventStore.getSnapshot().events[0].month).toBe(6);
  });

  it("removeEvent deletes by id", () => {
    eventStore.addEvent({ year: 2022, month: 1, label: "x" });
    const id = eventStore.getSnapshot().events[0].id;
    eventStore.removeEvent(id);
    expect(eventStore.getSnapshot().events).toHaveLength(0);
  });

  it("ignores addEvent past MAX_EVENTS", () => {
    for (let i = 0; i < 25; i++)
      eventStore.addEvent({ year: 2000 + i, month: 1, label: `e${i}` });
    expect(eventStore.getSnapshot().events).toHaveLength(20);
  });

  it("getServerSnapshot is always the empty default", () => {
    eventStore.addEvent({ year: 2022, month: 1, label: "x" });
    expect(eventStore.getServerSnapshot()).toEqual({
      v: 1,
      enabled: false,
      events: [],
    });
  });
});
