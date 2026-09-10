import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// A faithful, unaggregated snapshot of EU API weekly trade rows — see
// features/sync-eu-agrifood/db/mutations/replaceProductData.ts for what
// populates this table. The `raw_` prefix marks it as an untouched
// upstream copy (cf. the incoming raw_comext_imports).
//
// No composite business key: even a 7-column one (taric10ProductCode,
// partnerCode, memberStateCode, marketingYear, week, procedure,
// preference) still left true duplicates the source itself doesn't
// distinguish (confirmed live: 6 of 70,754 rows identical on every
// field). replaceProductData.ts instead replaces a whole (product,
// marketingYear) slice wholesale on every run — a plain surrogate `id`
// is enough, and true duplicates are simply stored as two rows.
export const rawTaxudWeeklyRows = pgTable("raw_taxud_weekly_rows", {
  id: serial().primaryKey(),
  sector: text().notNull(),
  marketingYear: text("marketing_year").notNull(),
  week: integer().notNull(),
  memberStateCode: text("member_state_code").notNull(),
  memberStateName: text("member_state_name").notNull(),
  partnerCode: text("partner_code").notNull(),
  partner: text().notNull(),
  product: text().notNull(),
  cn8ProductCode: text("cn8_product_code").notNull(),
  taric10ProductCode: text("taric10_product_code").notNull(),
  procedure: integer().notNull(),
  preference: integer().notNull(),
  euroValue: numeric("euro_value").notNull(),
  unitValue: numeric("unit_value").notNull(),
  kg: numeric().notNull(),
  kgEquivalent: numeric("kg_equivalent").notNull(),
  coefficient: numeric().notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // The one read filter: `getWeeklyRowsByProduct` does `where product = ?`.
  // Also the write scope: `replaceProductData` deletes by (product,
  // marketing_year) before re-inserting.
  index("raw_taxud_weekly_rows_product_idx").on(t.product),
]);
