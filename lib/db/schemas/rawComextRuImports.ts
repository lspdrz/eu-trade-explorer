import {
  index,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// A faithful, unaggregated snapshot of Eurostat COMEXT monthly import cells
// (dataset DS-045409, reporter=EU27_2020, flow=import) for partner=RU
// across ALL HS chapters — the sibling of raw_comext_imports, which is
// scoped the opposite way (2 headings, all partners). Kept separate
// because raw_comext_imports's "2 headings only" invariant is assumed
// elsewhere in the codebase; widening it would break that.
//
// One row = one (cn8ProductCode, period) observation — partnerCode is
// always "RU" here, kept as a column only for shape-parity with
// raw_comext_imports, not because it varies. No business key / no upsert,
// same rationale as raw_comext_imports: the writer replaces a slice of
// rows (by CN8 code, see replaceComextRuObservations) wholesale per run.
export const rawComextRuImports = pgTable(
  "raw_comext_ru_imports",
  {
    id: serial().primaryKey(),
    cn8ProductCode: text("cn8_product_code").notNull(),
    partnerCode: text("partner_code").notNull(),
    period: text().notNull(), // "YYYY-MM"
    quantity100kg: numeric("quantity_100kg"),
    valueEuros: numeric("value_euros"),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("raw_comext_ru_imports_cn8_prefix_idx").using(
      "btree",
      t.cn8ProductCode.op("text_pattern_ops"),
    ),
  ],
);
