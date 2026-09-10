"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ChartEvent, StoredEvents } from "../../types";
import {
  EMPTY_EVENTS,
  EVENTS_KEY,
  MAX_EVENTS,
  isValidEvent,
  parseStoredEvents,
  serializeStoredEvents,
  sortEvents,
} from "../utils/chartEvents";

const listeners = new Set<() => void>();
let cache: { raw: string | null; parsed: StoredEvents } | null = null;
let memoryFallback: StoredEvents | null = null; // used when localStorage throws

function read(): StoredEvents {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!cache || cache.raw !== raw) {
      cache = { raw, parsed: parseStoredEvents(raw) };
    }
    return cache.parsed;
  } catch {
    return memoryFallback ?? EMPTY_EVENTS;
  }
}

function write(next: StoredEvents) {
  const value: StoredEvents = { ...next, events: sortEvents(next.events) };
  memoryFallback = value;
  try {
    const raw = serializeStoredEvents(value);
    localStorage.setItem(EVENTS_KEY, raw);
    cache = { raw, parsed: value };
  } catch {
    // storage disabled — memoryFallback keeps the page consistent this session
    cache = { raw: null, parsed: value };
  }
  for (const l of listeners) l();
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * The chart-events store. `useChartEvents` wraps it; it's exported directly so
 * the pure store logic can be tested without React. Mirrors ThemeToggle's
 * external-store pattern: a snapshot memoised on the raw localStorage string,
 * cross-tab (`storage` event) + same-tab (`listeners`) notification.
 */
export const eventStore = {
  getSnapshot: read,
  getServerSnapshot: (): StoredEvents => EMPTY_EVENTS,
  subscribe(cb: () => void) {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  },
  setEnabled(on: boolean) {
    write({ ...read(), enabled: on });
  },
  addEvent(draft: { year: number; month: number; label: string }) {
    const current = read();
    if (current.events.length >= MAX_EVENTS) return;
    const candidate: ChartEvent = {
      id: randomId(),
      year: draft.year,
      month: draft.month,
      label: draft.label.trim(),
    };
    if (!isValidEvent(candidate)) return;
    write({ ...current, events: [...current.events, candidate] });
  },
  updateEvent(id: string, patch: Partial<Omit<ChartEvent, "id">>) {
    const current = read();
    const events = current.events.map((e) => {
      if (e.id !== id) return e;
      const merged = { ...e, ...patch, label: (patch.label ?? e.label).trim() };
      return isValidEvent(merged) ? merged : e;
    });
    write({ ...current, events });
  },
  removeEvent(id: string) {
    const current = read();
    write({ ...current, events: current.events.filter((e) => e.id !== id) });
  },
  /** Test-only: clear the module-level caches between cases. */
  __resetForTests() {
    cache = null;
    memoryFallback = null;
    listeners.clear();
  },
};

export function useChartEvents() {
  const stored = useSyncExternalStore(
    eventStore.subscribe,
    eventStore.getSnapshot,
    eventStore.getServerSnapshot,
  );

  return {
    enabled: stored.enabled,
    events: stored.events,
    setEnabled: useCallback((on: boolean) => eventStore.setEnabled(on), []),
    addEvent: useCallback(
      (d: { year: number; month: number; label: string }) =>
        eventStore.addEvent(d),
      [],
    ),
    updateEvent: useCallback(
      (id: string, patch: Partial<Omit<ChartEvent, "id">>) =>
        eventStore.updateEvent(id, patch),
      [],
    ),
    removeEvent: useCallback((id: string) => eventStore.removeEvent(id), []),
  };
}
