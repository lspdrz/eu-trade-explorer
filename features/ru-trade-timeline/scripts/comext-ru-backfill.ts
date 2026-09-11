/**
 * ONE-OFF BACKFILL. Populates `raw_comext_ru_imports` with a faithful,
 * unaggregated monthly snapshot of Russian imports into the EU: every CN8
 * product code, 2010 through this year, both QUANTITY_IN_100KG and
 * VALUE_IN_EUROS. Not wired into any recurring sync — re-run by hand only
 * if the source data needs refreshing.
 *
 * Reuses the fetch/chunk/retry/checkpoint mechanics proven by
 * scripts/comext-ru-chapter-scout.ts (untouched by this script — that one
 * stays exactly as it is). Differences: requests both indicators instead
 * of one, writes rows to Postgres via replaceComextRuObservations instead
 * of aggregating to CSV, and the checkpoint only needs to remember which
 * chunks are already done — progress otherwise lives in the database.
 *
 * Run:
 *   npx tsx --conditions=react-server --env-file=.env.local features/ru-trade-timeline/scripts/comext-ru-backfill.ts
 *   npx tsx --conditions=react-server --env-file=.env.local features/ru-trade-timeline/scripts/comext-ru-backfill.ts --fresh   # ignore the checkpoint
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { contactComextAPI } from "@/lib/eurostat-comext/client";
import { replaceComextRuObservations } from "@/features/ru-trade-timeline/db/mutations/replaceComextRuObservations";
import type { ComextRuObservation } from "@/features/ru-trade-timeline/types";

const CODELIST_URL =
  "https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/codelist/ESTAT/CXT_NC?format=TSV";

const START_YEAR = 2010;
const END_YEAR = new Date().getFullYear();

const CONCURRENCY = 4;
const MAX_PRODUCTS_PER_CHUNK = 600;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 8_000;

const DATA_DIR = "scripts/data";
const CHECKPOINT_PATH = `${DATA_DIR}/.comext-ru-backfill-checkpoint.json`;

// ---------------------------------------------------------------- codelist

/**
 * Chapter ("28") -> its real CN8 codes. Same filtering rules as the
 * scout's loadNomenclature: only 2-digit chapters (excluding "00", the
 * confidential-total pseudo-chapter) and digits-then-trailing-X CN8 codes
 * (real codes plus "not elsewhere specified" pseudo-codes) — excludes
 * every other administrative pseudo-code ("...S...", "...CCC...", etc.),
 * which the API rejects the whole request over if included.
 */
async function loadChapterToCN8(): Promise<Map<string, string[]>> {
  console.log("Fetching the CN8 codelist...");
  const res = await fetch(CODELIST_URL);
  if (!res.ok) throw new Error(`codelist fetch failed: ${res.status} ${res.statusText}`);
  const tsv = await res.text();

  const chapters = new Set<string>();
  const chapterToCN8 = new Map<string, string[]>();

  for (const line of tsv.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const code = line.slice(0, tab);

    if (/^\d{2}$/.test(code) && code !== "00") {
      chapters.add(code);
    } else if (code.length === 8 && /^\d+X*$/.test(code)) {
      const chapter = code.slice(0, 2);
      const list = chapterToCN8.get(chapter);
      if (list) list.push(code);
      else chapterToCN8.set(chapter, [code]);
    }
  }

  for (const chapter of chapterToCN8.keys()) {
    if (!chapters.has(chapter)) chapterToCN8.delete(chapter); // "00" pseudo-chapter
  }

  const totalCodes = [...chapterToCN8.values()].reduce((n, l) => n + l.length, 0);
  console.log(`${chapterToCN8.size} chapters, ${totalCodes} CN8 codes.`);
  return chapterToCN8;
}

// --------------------------------------------------------------- requests

interface Job {
  chapter: string;
  chunkIndex: number;
  cn8Codes: string[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildJobs(chapterToCN8: Map<string, string[]>): Job[] {
  const jobs: Job[] = [];
  for (const [chapter, codes] of chapterToCN8) {
    chunk(codes, MAX_PRODUCTS_PER_CHUNK).forEach((cn8Codes, chunkIndex) => {
      jobs.push({ chapter, chunkIndex, cn8Codes });
    });
  }
  return jobs;
}

function jobKey(job: Job): string {
  return `${job.chapter}#${job.chunkIndex}`;
}

/**
 * Parses one response into observations, keyed by (CN8, period) so both
 * indicators land on the same ComextRuObservation. Throws (rather than
 * returning []) if the body doesn't look like the expected CSV — the
 * symptom of a chunk's request having been too large for a synchronous
 * response, which would otherwise masquerade as "no RU trade" for exactly
 * the chapters most likely to hit the size cap.
 */
function parseObservations(csv: string, job: Job): ComextRuObservation[] {
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

  const byKey = new Map<string, ComextRuObservation>();
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(",");
    const indicator = f[iIndicator];
    if (indicator !== "QUANTITY_IN_100KG" && indicator !== "VALUE_IN_EUROS") continue;
    const n = Number(f[iValue]);
    if (!Number.isFinite(n)) continue;

    const cn8ProductCode = f[iProduct];
    const period = f[iPeriod];
    const key = `${cn8ProductCode}|${period}`;
    const obs = byKey.get(key) ?? {
      cn8ProductCode,
      period,
      quantity100kg: null,
      valueEuros: null,
    };
    if (indicator === "QUANTITY_IN_100KG") obs.quantity100kg = n;
    else obs.valueEuros = n;
    byKey.set(key, obs);
  }
  return [...byKey.values()];
}

async function fetchJob(job: Job): Promise<ComextRuObservation[]> {
  const params = new URLSearchParams({
    "c[flow]": "1",
    "c[partner]": "RU",
    "c[indicators]": "QUANTITY_IN_100KG,VALUE_IN_EUROS",
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
  return parseObservations(await res.text(), job);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(job: Job): Promise<ComextRuObservation[]> {
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

async function runPool<T>(
  jobs: T[],
  concurrency: number,
  worker: (job: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function runner() {
    while (next < jobs.length) {
      const job = jobs[next++];
      await worker(job);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, runner));
}

// ------------------------------------------------------------- checkpoint

interface Checkpoint {
  completedJobKeys: string[];
}

function loadCheckpoint(fresh: boolean): Set<string> {
  if (fresh || !existsSync(CHECKPOINT_PATH)) return new Set();
  const cp: Checkpoint = JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8"));
  return new Set(cp.completedJobKeys);
}

function saveCheckpoint(done: Set<string>): void {
  const cp: Checkpoint = { completedJobKeys: [...done] };
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp));
}

// ------------------------------------------------------------------- main

async function main(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  const fresh = process.argv.includes("--fresh");

  const chapterToCN8 = await loadChapterToCN8();
  const allJobs = buildJobs(chapterToCN8);
  const done = loadCheckpoint(fresh);
  const remaining = allJobs.filter((j) => !done.has(jobKey(j)));

  console.log(
    `${allJobs.length} requests total across ${chapterToCN8.size} chapters. ` +
      `${done.size} already done, ${remaining.length} to go.`,
  );

  let completed = 0;
  let totalRows = 0;
  const failed: Job[] = [];

  await runPool(remaining, CONCURRENCY, async (job) => {
    try {
      const observations = await fetchWithRetry(job);
      const { rowsWritten } = await replaceComextRuObservations({
        cn8ProductCodes: job.cn8Codes,
        observations,
      });
      totalRows += rowsWritten;
      done.add(jobKey(job));
      completed++;
      console.log(`[${completed}/${remaining.length}] ${jobKey(job)} — ${rowsWritten} rows`);
      saveCheckpoint(done);
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
  console.log(`done. ${totalRows} rows written across this run.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
