/**
 * ONE-OFF SCOUT — throwaway exploratory script. Not part of the app, not
 * wired into any sync path, never touches `raw_comext_imports` (wrong
 * partner scope, wrong product scope — writing there would violate the
 * "2 headings only" invariant the rest of the codebase assumes).
 *
 * Question it answers: which HS chapters/headings of *Russian* imports
 * into the EU were big and shrank, or were small and grew, around the
 * 2022 invasion — cheaply, before deciding whether any of it is worth a
 * real backfill into the app's schema.
 *
 * Method: one request per HS2 chapter (~97 of them), filtered to
 * `partner=RU`, spanning 2010 → this year, both indicators dropped to just
 * quantity (we only need tonnes). Restricting to one partner shrinks the
 * response enough that a whole chapter's CN8 list, across the full time
 * range, should still land under COMEXT's synchronous-response size cap —
 * chapters big enough to risk it (84 machinery, 85 electronics, ...) are
 * auto-split into multiple chunked requests by `MAX_PRODUCTS_PER_CHUNK`.
 * The same CN8-level rows are aggregated to BOTH the chapter level and the
 * heading (4-digit) level at no extra request cost, so this produces two
 * CSVs from one run: a ~97-row sector-level scan and a ~1,200-row
 * product-level scan, letting you skip a separate "drill into the
 * interesting chapters" pass.
 *
 * Modest concurrency (4 in flight) + retry-with-backoff + a checkpoint
 * file, so a crash or a Ctrl-C loses nothing — re-running skips whatever
 * already succeeded.
 *
 * Run:
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/comext-ru-chapter-scout.ts
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/comext-ru-chapter-scout.ts --fresh   # ignore the checkpoint, start a new timestamped run
 *
 * Writes (all under scripts/data/, which is gitignored — one-off research
 * output, not part of the app):
 *   scripts/data/{startedAt}-comext-ru-by-chapter.csv
 *   scripts/data/{startedAt}-comext-ru-by-heading.csv
 *   scripts/data/.comext-ru-scout-checkpoint.json   (progress; carries the
 *     run's `startedAt` so a resumed run's output keeps the timestamp of
 *     when the scan *started*, not when it happened to finish. Delete it
 *     or pass --fresh to begin a new run with a new timestamp.)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { contactComextAPI } from "@/lib/eurostat-comext/client";

const CODELIST_URL =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/codelist/ESTAT/CXT_NC?format=TSV";

// Duplicated from lib/eurostat-comext/client.ts on purpose — this is a
// throwaway script and shouldn't touch shared infra for one URL constant.
const DATA_BASE_URL =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/3.0/data/dataflow/ESTAT/DS-045409/1.0/M.EU27_2020";

const START_YEAR = 2010;
const END_YEAR = new Date().getFullYear();
const REPORT_YEARS = [2012, 2022, 2025] as const;

const CONCURRENCY = 4;
/** ~600 CN8 codes ≈ 5.4 KB of query string — chapters bigger than this
 *  (84, 85, 29, ...) get split into this many codes per request. Lower it
 *  if a chapter's response comes back malformed (see the CSV-shape guard
 *  below) — that's the symptom of the query string being too long for
 *  COMEXT to accept synchronously. */
const MAX_PRODUCTS_PER_CHUNK = 600;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 8_000;

const DATA_DIR = "scripts/data";
const CHECKPOINT_PATH = `${DATA_DIR}/.comext-ru-scout-checkpoint.json`;

/** UTC, filename-safe, second precision — e.g. "2026-09-11T07-33-16Z". */
function timestampSlug(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace(/:/g, "-")}Z`;
}

// ---------------------------------------------------------------- codelist

interface Nomenclature {
  chapterNames: Map<string, string>; // "28" -> "INORGANIC CHEMICALS..."
  headingNames: Map<string, string>; // "2814" -> "Ammonia, anhydrous..."
  chapterToCN8: Map<string, string[]>; // "28" -> ["28011000", "280110XX", ...]
  headingToCN8: Map<string, string[]>; // "2814" -> [...] (for per-heading verification URLs)
}

/**
 * Eurostat's CN8 codelist (~5 MB TSV, `code\tEnglish name`) carries every
 * level in one file: 2-digit chapters, 4-digit headings, and 8-digit CN8
 * lines (real codes plus "...XX" not-elsewhere-specified pseudo-codes —
 * both queryable; excludes "...S..." confidentiality-artifact codes, same
 * rule as features/sync-comext/constants/headings.ts). A CN8 code's first
 * 2/4 digits ARE its chapter/heading, so the groupings fall out for free.
 */
async function loadNomenclature(): Promise<Nomenclature> {
  console.log("Fetching the CN8 codelist...");
  const res = await fetch(CODELIST_URL);
  if (!res.ok) throw new Error(`codelist fetch failed: ${res.status} ${res.statusText}`);
  const tsv = await res.text();

  const chapterNames = new Map<string, string>();
  const headingNames = new Map<string, string>();
  const chapterToCN8 = new Map<string, string[]>();
  const headingToCN8 = new Map<string, string[]>();

  for (const line of tsv.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const code = line.slice(0, tab);
    const name = line.slice(tab + 1).trim();

    if (/^\d{2}$/.test(code) && code !== "00") {
      chapterNames.set(code, name);
    } else if (/^\d{4}$/.test(code)) {
      headingNames.set(code, name);
    } else if (code.length === 8 && /^\d+X*$/.test(code)) {
      // Real CN8 codes, plus the two "not elsewhere specified" patterns
      // (e.g. "010690XX", "0106XXXX") — both digits-then-trailing-X. This
      // excludes every administrative pseudo-code the list also carries:
      // "...S..." confidentiality artifacts (010410SS) and the various
      // correction/special-provision codes (01CCC000, 01III000, 01MMM000,
      // and more: AAA/BBB/EEE/FFF/PPP/RRR/TTT/VVV/WWW/YYY/ZZZZZZZZ). Any
      // one of those in a `c[product]` list gets the WHOLE request
      // rejected with 400 — this bit the very first pilot run.
      const chapter = code.slice(0, 2);
      const heading = code.slice(0, 4);
      appendTo(chapterToCN8, chapter, code);
      appendTo(headingToCN8, heading, code);
    }
  }

  console.log(
    `${chapterNames.size} chapters, ${headingNames.size} headings, ${[...chapterToCN8.values()].reduce((n, l) => n + l.length, 0)} CN8 codes.`,
  );
  return { chapterNames, headingNames, chapterToCN8, headingToCN8 };
}

function appendTo<K>(map: Map<K, string[]>, key: K, value: string): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

// --------------------------------------------------------------- requests

interface Job {
  /** Chapter code, e.g. "28". Every job belongs to exactly one chapter. */
  chapter: string;
  chunkIndex: number;
  cn8Codes: string[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildJobs(chapterToCN8: Map<string, string[]>, chapterNames: Map<string, string>): Job[] {
  const jobs: Job[] = [];
  for (const [chapter, codes] of chapterToCN8) {
    if (!chapterNames.has(chapter)) continue; // "00" (confidential-total) — not a real chapter
    chunk(codes, MAX_PRODUCTS_PER_CHUNK).forEach((cn8Codes, chunkIndex) => {
      jobs.push({ chapter, chunkIndex, cn8Codes });
    });
  }
  return jobs;
}

function jobKey(job: Job): string {
  return `${job.chapter}#${job.chunkIndex}`;
}

function buildQueryUrl(cn8Codes: string[]): string {
  const params = new URLSearchParams({
    "c[flow]": "1",
    "c[partner]": "RU",
    "c[indicators]": "QUANTITY_IN_100KG",
    "c[product]": cn8Codes.join(","),
    "c[TIME_PERIOD]": `ge:${START_YEAR}-01+le:${END_YEAR}-12`,
    format: "csvdata",
  });
  return `${DATA_BASE_URL}?${params.toString()}`;
}

interface QuantityRow {
  product: string;
  period: string; // "YYYY-MM"
  quantity100kg: number;
}

/**
 * Parses one response. Throws (rather than silently returning []) if the
 * body doesn't look like the expected CSV — the symptom of a chapter's
 * request having been too large and getting queued as an async job
 * instead of returned inline, which would otherwise masquerade as "no RU
 * trade" for exactly the chapters most likely to hit the size cap.
 */
function parseQuantityRows(csv: string, job: Job): QuantityRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0 || lines[0] === "") return [];

  const header = lines[0].split(",");
  if (!header.includes("product") || !header.includes("indicators")) {
    throw new Error(
      `chapter ${job.chapter} chunk ${job.chunkIndex}: response doesn't look like CSV ` +
        `(too large for a synchronous response?). First 200 chars: ${csv.slice(0, 200)}`,
    );
  }
  const iProduct = header.indexOf("product");
  const iIndicator = header.indexOf("indicators");
  const iPeriod = header.indexOf("TIME_PERIOD");
  const iValue = header.indexOf("OBS_VALUE");

  const rows: QuantityRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(",");
    if (f[iIndicator] !== "QUANTITY_IN_100KG") continue;
    const n = Number(f[iValue]);
    if (!Number.isFinite(n)) continue;
    rows.push({ product: f[iProduct], period: f[iPeriod], quantity100kg: n });
  }
  return rows;
}

async function fetchJob(job: Job): Promise<QuantityRow[]> {
  const params = new URLSearchParams({
    "c[flow]": "1",
    "c[partner]": "RU",
    "c[indicators]": "QUANTITY_IN_100KG",
    "c[product]": job.cn8Codes.join(","),
    "c[TIME_PERIOD]": `ge:${START_YEAR}-01+le:${END_YEAR}-12`,
    format: "csvdata",
  });
  const res = await contactComextAPI(params);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `chapter ${job.chapter} chunk ${job.chunkIndex}: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`,
    );
  }
  return parseQuantityRows(await res.text(), job);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(job: Job): Promise<QuantityRow[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchJob(job);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        console.warn(`  retry ${attempt + 1}/${MAX_RETRIES} — ${jobKey(job)}: ${error}`);
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError;
}

/** A fixed-size worker pool over `jobs` — `concurrency` requests in flight. */
async function runPool<T>(jobs: T[], concurrency: number, worker: (job: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function runner() {
    while (next < jobs.length) {
      const job = jobs[next++];
      await worker(job);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, runner));
}

// ------------------------------------------------------------ aggregation

type YearTonnes = Map<string, Map<number, number>>; // key -> year -> tonnes

function addTonnes(map: YearTonnes, key: string, year: number, tonnes: number): void {
  let byYear = map.get(key);
  if (!byYear) {
    byYear = new Map();
    map.set(key, byYear);
  }
  byYear.set(year, (byYear.get(year) ?? 0) + tonnes);
}

// ------------------------------------------------------------- checkpoint

interface Checkpoint {
  /** When this run first started — reused for the output filenames even
   *  across a resume, so they reflect when the scan began, not when a
   *  resumed process happened to finish. */
  startedAt: string;
  completedJobKeys: string[];
  chapterYear: Record<string, Record<string, number>>;
  headingYear: Record<string, Record<string, number>>;
}

function toYearTonnes(rec: Record<string, Record<string, number>>): YearTonnes {
  const map: YearTonnes = new Map();
  for (const [key, byYear] of Object.entries(rec)) {
    map.set(key, new Map(Object.entries(byYear).map(([y, t]) => [Number(y), t])));
  }
  return map;
}

function fromYearTonnes(map: YearTonnes): Record<string, Record<string, number>> {
  const rec: Record<string, Record<string, number>> = {};
  for (const [key, byYear] of map) {
    rec[key] = Object.fromEntries(byYear);
  }
  return rec;
}

function loadCheckpoint(
  fresh: boolean,
): { startedAt: string; done: Set<string>; chapterYear: YearTonnes; headingYear: YearTonnes } {
  if (fresh || !existsSync(CHECKPOINT_PATH)) {
    return { startedAt: timestampSlug(new Date()), done: new Set(), chapterYear: new Map(), headingYear: new Map() };
  }
  const cp: Checkpoint = JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8"));
  return {
    startedAt: cp.startedAt,
    done: new Set(cp.completedJobKeys),
    chapterYear: toYearTonnes(cp.chapterYear),
    headingYear: toYearTonnes(cp.headingYear),
  };
}

function saveCheckpoint(startedAt: string, done: Set<string>, chapterYear: YearTonnes, headingYear: YearTonnes): void {
  const cp: Checkpoint = {
    startedAt,
    completedJobKeys: [...done],
    chapterYear: fromYearTonnes(chapterYear),
    headingYear: fromYearTonnes(headingYear),
  };
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp));
}

// -------------------------------------------------------------- CSV output

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** less/more/same, "new" (0 -> something), "stopped" (something -> 0), or
 *  "no trade" (0 -> 0). % is left blank where it would be undefined or
 *  infinite rather than shown as a misleading number. */
function classify(before: number, after: number): { direction: string; absChange: number; pctChange: string } {
  const absChange = after - before;
  if (before === 0 && after === 0) return { direction: "no trade", absChange, pctChange: "" };
  if (before === 0) return { direction: "new", absChange, pctChange: "" };
  if (after === 0) return { direction: "stopped", absChange, pctChange: "-100.0" };
  const pct = (absChange / before) * 100;
  const direction = after > before ? "more" : after < before ? "less" : "same";
  return { direction, absChange, pctChange: pct.toFixed(1) };
}

/** Two comparison windows — pre-war-to-invasion (2012->2022) and
 *  invasion-to-now (2022->2025) — reported separately rather than as one
 *  2012->2025 figure, so a product that spiked in 2022 and then fell back
 *  doesn't read the same as one that changed steadily. */
function writeReportCsv(
  path: string,
  yearTonnes: YearTonnes,
  names: Map<string, string>,
  cn8ByCode: Map<string, string[]>,
): void {
  const [y1, y2, y3] = REPORT_YEARS;
  const header = [
    "url",
    "code",
    "name",
    `tonnes_${y1}`,
    `tonnes_${y2}`,
    `tonnes_${y3}`,
    `direction_${y1}_${y2}`,
    `abs_change_${y1}_${y2}`,
    `pct_change_${y1}_${y2}`,
    `direction_${y2}_${y3}`,
    `abs_change_${y2}_${y3}`,
    `pct_change_${y2}_${y3}`,
  ];
  const rows: string[][] = [];
  const sortKeys: number[] = [];

  for (const [code, byYear] of yearTonnes) {
    const [t1, t2, t3] = REPORT_YEARS.map((y) => Math.round(byYear.get(y) ?? 0));
    const first = classify(t1, t2);
    const second = classify(t2, t3);
    const url = buildQueryUrl(cn8ByCode.get(code) ?? []);
    rows.push([
      url,
      code,
      names.get(code) ?? "",
      String(t1),
      String(t2),
      String(t3),
      first.direction,
      String(first.absChange),
      first.pctChange,
      second.direction,
      String(second.absChange),
      second.pctChange,
    ]);
    sortKeys.push(Math.max(Math.abs(first.absChange), Math.abs(second.absChange)));
  }

  // Biggest mover in *either* window first, regardless of sign.
  const order = rows.map((_, i) => i).sort((a, b) => sortKeys[b] - sortKeys[a]);

  const csv =
    [header, ...order.map((i) => rows[i])].map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
  writeFileSync(path, csv);
  console.log(`wrote ${rows.length} rows -> ${path}`);
}

// ------------------------------------------------------------------- main

async function main(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const fresh = process.argv.includes("--fresh");

  const nomenclature = await loadNomenclature();
  const allJobs = buildJobs(nomenclature.chapterToCN8, nomenclature.chapterNames);
  const { startedAt, done, chapterYear, headingYear } = loadCheckpoint(fresh);
  const remaining = allJobs.filter((j) => !done.has(jobKey(j)));

  console.log(
    `${allJobs.length} requests total across ${nomenclature.chapterToCN8.size} chapters` +
      ` (${allJobs.length - nomenclature.chapterToCN8.size} chapters needed splitting).` +
      ` ${done.size} already done, ${remaining.length} to go.`,
  );

  let completed = 0;
  const failed: Job[] = [];

  await runPool(remaining, CONCURRENCY, async (job) => {
    try {
      const rows = await fetchWithRetry(job);
      for (const row of rows) {
        const year = Number(row.period.slice(0, 4));
        const tonnes = row.quantity100kg / 10;
        addTonnes(chapterYear, job.chapter, year, tonnes);
        addTonnes(headingYear, row.product.slice(0, 4), year, tonnes);
      }
      done.add(jobKey(job));
      completed++;
      console.log(`[${completed}/${remaining.length}] ${jobKey(job)} — ${rows.length} rows`);
      saveCheckpoint(startedAt, done, chapterYear, headingYear);
    } catch (error) {
      failed.push(job);
      console.error(`FAILED ${jobKey(job)}: ${error}`);
    }
  });

  if (failed.length > 0) {
    console.warn(
      `\n${failed.length} request(s) failed after retries: ${failed.map(jobKey).join(", ")}.\n` +
        `Re-run the script — completed requests are skipped via the checkpoint.\n`,
    );
  }

  writeReportCsv(
    `${DATA_DIR}/${startedAt}-comext-ru-by-chapter.csv`,
    chapterYear,
    nomenclature.chapterNames,
    nomenclature.chapterToCN8,
  );
  writeReportCsv(
    `${DATA_DIR}/${startedAt}-comext-ru-by-heading.csv`,
    headingYear,
    nomenclature.headingNames,
    nomenclature.headingToCN8,
  );
  console.log("done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
