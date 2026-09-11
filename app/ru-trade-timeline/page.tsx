import { RuTradeTimeline } from "@/features/ru-trade-timeline/ui";

export default function RuTradeTimelinePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Russian fertiliser imports, 2010–2025</h1>
      <p className="mt-2 text-muted">
        While most EU imports from Russia collapsed after the 2022 invasion,
        fertiliser did not follow the same trend.
      </p>
      <div className="mt-8">
        <RuTradeTimeline />
      </div>
    </main>
  );
}
