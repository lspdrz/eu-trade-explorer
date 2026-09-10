import {
  index,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// A faithful, unaggregated snapshot of Eurostat COMEXT monthly import cells
// (dataset DS-045409, reporter=EU27_2020, flow=import) for HS headings 2814
// and 3102 — see features/sync-comext/ for what populates it.
//
// One row = one (cn8ProductCode, partnerCode, period) observation.
// No business key / no upsert (same rationale as raw_taxud_weekly_rows):
// the writer replaces a whole (heading, periods) slice wholesale per run.
// `quantity_100kg` is COMEXT's unit — hundredweight, not kg. Both measures
// are nullable: a cell may carry only one indicator. No partner name — the
// SDMX 3.0 CSV feed is code-only; a read path maps codes to names once.
export const rawComextImports = pgTable("raw_comext_imports", {
  id: serial().primaryKey(),
  cn8ProductCode: text("cn8_product_code").notNull(),
  partnerCode: text("partner_code").notNull(),
  period: text().notNull(), // "YYYY-MM"
  quantity100kg: numeric("quantity_100kg"),
  valueEuros: numeric("value_euros"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // `getComextRowsByHeading` matches by CN8 prefix (`cn8_product_code LIKE
  // '2814%'`). `text_pattern_ops` is what lets a btree index serve a
  // prefix LIKE regardless of the database's collation.
  index("raw_comext_imports_cn8_prefix_idx").using(
    "btree",
    t.cn8ProductCode.op("text_pattern_ops"),
  ),
]);
