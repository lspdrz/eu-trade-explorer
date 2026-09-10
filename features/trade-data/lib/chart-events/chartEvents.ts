import type { ChartEvent, StoredEvents } from "@/features/trade-data/types";

export const EVENTS_KEY = "chart-events";
export const MAX_EVENTS = 20;
export const MAX_LABEL = 80;
export const EMPTY_EVENTS: StoredEvents = { v: 1, enabled: false, events: [] };

/** Short month names, indexed 0–11 (so `MONTH_LABELS[event.month - 1]`). */
export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "Mar 2022" for an event's month/year. */
export function formatEventDate(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

function isInt(n: unknown, lo: number, hi: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;
}

export function isValidEvent(e: unknown): e is ChartEvent {
  if (!e || typeof e !== "object") return false;
  const c = e as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    isInt(c.year, MIN_YEAR, MAX_YEAR) &&
    isInt(c.month, 1, 12) &&
    typeof c.label === "string" &&
    c.label.trim().length > 0
  );
}

export function sortEvents(events: ChartEvent[]): ChartEvent[] {
  return [...events].sort((a, b) => a.year - b.year || a.month - b.month);
}

/**
 * Parse the localStorage blob into a StoredEvents. Never throws, needs no
 * context — same lenient posture as parseSelection: malformed entries are
 * dropped, not repaired; a corrupt or wrong-version value yields the empty
 * default. Events come back sorted by (year, month).
 */
export function parseStoredEvents(raw: string | null): StoredEvents {
  if (!raw) return EMPTY_EVENTS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_EVENTS;
  }
  if (!data || typeof data !== "object") return EMPTY_EVENTS;
  const d = data as Record<string, unknown>;
  if (d.v !== 1) return EMPTY_EVENTS;

  const events = Array.isArray(d.events) ? d.events : [];
  const clean = events
    .filter(isValidEvent)
    .map((e) => ({ ...e, label: e.label.trim().slice(0, MAX_LABEL) }))
    .slice(0, MAX_EVENTS);

  return { v: 1, enabled: Boolean(d.enabled), events: sortEvents(clean) };
}

/** The inverse of parseStoredEvents; events are stored chronologically too. */
export function serializeStoredEvents(value: StoredEvents): string {
  return JSON.stringify({
    v: 1,
    enabled: value.enabled,
    events: sortEvents(value.events),
  });
}

/**
 * The x (in the chart's pixel space, the same units ChartTooltip uses) of an
 * event's vertical rule: its year's band start, offset into the band by month.
 * `null` when the year isn't a band (outside the visible range).
 */
export function eventX(
  year: number,
  month: number,
  x0: (year: number) => number | undefined,
  bandwidth: number,
  marginLeft: number,
): number | null {
  const bandStart = x0(year);
  if (bandStart === undefined) return null;
  return marginLeft + bandStart + (bandwidth * (month - 0.5)) / 12;
}
