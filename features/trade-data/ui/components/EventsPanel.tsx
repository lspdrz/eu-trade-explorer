"use client";

import { Switch } from "@headlessui/react";
import { useState } from "react";
import type { ChartEvent } from "../../types";
import { MAX_EVENTS, formatEventDate } from "../utils/chartEvents";
import { useChartEvents } from "../hooks/useChartEvents";
import { EventForm, emptyDraft } from "./EventForm";

/**
 * The right-column events editor. Self-wired to `useChartEvents`: a "show on
 * chart" switch, the viewer's events (edit in place, delete immediately), and
 * an add form. Holds only transient form/edit UI state.
 */
export function EventsPanel() {
  const { enabled, events, setEnabled, addEvent, updateEvent, removeEvent } =
    useChartEvents();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const atCap = events.length >= MAX_EVENTS;

  return (
    <section className="rounded-lg border border-border p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">Events</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted">Show on chart</span>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            className="group inline-flex h-5 w-9 items-center rounded-full border border-border bg-surface transition data-checked:bg-foreground"
          >
            <span className="sr-only">Show on chart</span>
            {/* the sliding knob — shifts right + recolours when checked */}
            <span className="ml-0.5 h-3.5 w-3.5 rounded-full bg-muted transition group-data-checked:ml-4 group-data-checked:bg-background" />
          </Switch>
        </span>
      </div>

      {events.length === 0 && !adding && (
        <p className="mt-4 text-xs text-muted">
          No events yet. Add an event to see it on the timeline.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {events.map((event: ChartEvent) => (
          <li
            key={event.id}
            className="border-b border-border/60 pb-3 last:border-0"
          >
            {editingId === event.id ? (
              <EventForm
                initial={{
                  year: event.year,
                  month: event.month,
                  label: event.label,
                }}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={(d) => {
                  updateEvent(event.id, d);
                  setEditingId(null);
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted tabular-nums">
                    {formatEventDate(event.year, event.month)}
                  </div>
                  <div>{event.label}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${event.label}`}
                    onClick={() => setEditingId(event.id)}
                    className="px-1 text-muted hover:text-foreground"
                  >
                    &#9998;
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${event.label}`}
                    onClick={() => removeEvent(event.id)}
                    className="px-1 text-muted hover:text-foreground"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <EventForm
          initial={emptyDraft()}
          submitLabel="Add"
          onCancel={() => setAdding(false)}
          onSubmit={(d) => {
            addEvent(d);
            setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          disabled={atCap}
          onClick={() => setAdding(true)}
          className="mt-3 text-sm text-muted hover:text-foreground disabled:opacity-40"
        >
          {atCap ? "Remove one to add another" : "+ Add event"}
        </button>
      )}
    </section>
  );
}
