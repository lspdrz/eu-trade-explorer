import "server-only";
import { getWeeklyRowsByProduct } from "../db/queries/getWeeklyRowsByProduct";
import type { YearlyPartnerTotal } from "../types";
import { aggregateYearlyTonnesByPartner } from "./aggregateYearlyTonnesByPartner";

/**
 * Reads every raw synced row for a product and aggregates them into yearly
 * EU-wide totals per partner — aggregation happens here, at read time, not
 * in the sync feature. Coordinates the DB read and the pure computation;
 * never touches the DB itself (see architecture-decisions.md).
 */
export async function getYearlyTonnesByPartner(
  product: string,
): Promise<YearlyPartnerTotal[]> {
  const rows = await getWeeklyRowsByProduct(product);
  return aggregateYearlyTonnesByPartner(rows);
}
