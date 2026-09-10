"use client";

import { useState } from "react";
import { MAX_LABEL, MONTH_LABELS, isValidEvent } from "../utils/chartEvents";

export type EventDraft = { year: number; month: number; label: string };

const THIS_YEAR = new Date().getFullYear();

export const emptyDraft = (): EventDraft => ({
  year: THIS_YEAR,
  month: 1,
  label: "",
});

/** Whether a draft would pass `isValidEvent` once given an id and a trimmed label. */
export function draftValid(d: EventDraft): boolean {
  return isValidEvent({ id: "draft", ...d, label: d.label.trim() });
}

/**
 * The add/edit form for a single event: month, year, label. Used both for a
 * new event and for editing an existing one (pass `initial`). Owns its draft
 * state; hands a trimmed, validated draft to `onSubmit`.
 */
export function EventForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: EventDraft;
  submitLabel: string;
  onSubmit: (draft: EventDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);

  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (draftValid(draft)) onSubmit({ ...draft, label: draft.label.trim() });
      }}
    >
      <div className="flex gap-2">
        <select
          aria-label="Month"
          className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
          value={draft.month}
          onChange={(e) => setDraft({ ...draft, month: Number(e.target.value) })}
        >
          {MONTH_LABELS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          aria-label="Year"
          type="number"
          min={1900}
          max={2100}
          className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm tabular-nums"
          value={draft.year}
          onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}
        />
      </div>
      <input
        aria-label="Label"
        type="text"
        maxLength={MAX_LABEL}
        placeholder="What happened?"
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!draftValid(draft)}
          className="rounded-md bg-foreground px-3 py-1 text-sm text-background disabled:opacity-40"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 text-sm text-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
