import { format } from "d3-format";

const compact = (n: number) => format(".3s")(n).replace("G", "B");

/**
 * The label that follows the hovered country on the globe: its import
 * stats, or a "no data" state for a country with none. Purely visual,
 * like ChartTooltip — hovered marks carry their own semantics elsewhere,
 * so this is `aria-hidden`. `landName` is the 110m topology's own name,
 * which covers every country regardless of import data (tonnesByCode/
 * nameByCode only cover partners with recorded imports).
 */
export function HoverTooltip({
  hovered,
  landName,
  tonnesByCode,
  nameByCode,
  rankByCode,
  totalCount,
}: {
  hovered: { code: string; x: number; y: number };
  landName: string | undefined;
  tonnesByCode: Map<string, number>;
  nameByCode: Map<string, string>;
  rankByCode: Map<string, number>;
  totalCount: number;
}) {
  const tonnes = tonnesByCode.get(hovered.code);
  const label =
    tonnes === undefined
      ? `${landName ?? hovered.code} — no data`
      : `${nameByCode.get(hovered.code)} — ${compact(tonnes)} t · #${rankByCode.get(hovered.code)} of ${totalCount}`;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-sm"
      style={{ left: hovered.x, top: hovered.y - 8 }}
    >
      {label}
    </div>
  );
}
