/**
 * The chart's placeholder when nothing is selected to compare. The message
 * is copy chosen by the caller — it depends which tab you're on.
 */
export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[420px] items-center justify-center border border-dashed border-border px-6 text-center text-sm text-muted">
      {message}
    </div>
  );
}
