import { format } from "d3-format";

/** Compact tonnes for axis ticks: 1.2M, 450k, 3.1B (d3 emits "G", we want "B"). */
export const formatTonnes = (n: number): string =>
  format("~s")(n).replace("G", "B");

/** Grouped thousands for tooltips and the data table. */
export const formatInt = format(",");
