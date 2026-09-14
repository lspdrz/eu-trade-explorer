# Project Guide — EU Trade Explorer

**Keep this file at 500 words or fewer.** It documents structure and
process, not every decision — decisions belong in code comments, not
here. If you're tempted to add a paragraph, cut one first.

## What this is

Three Next.js (App Router) routes sharing one Postgres database
(Drizzle + `pg`, Neon in production, local Docker in dev):
- `/` — fertilizer imports chart (`features/trade-data`)
- `/globe` — import-origin globe (`features/globe`)
- `/ru-trade-timeline` — RU comparison chart (`features/ru-trade-timeline`)

Deploy target: Vercel (us-east, alongside Neon). Vercel Cron is disabled
(free tier); sync scripts run by hand — see each script's own header
comment.

## Feature structure

Every feature lives at `features/<name>/` and follows the same shape,
read/write flow `ui/` → `lib/` → `db/`. Example — `features/trade-data/`:

```
features/trade-data/
├── types.ts
├── constants/           reference data checked into the repo
├── db/
│   ├── queries/          reads — one file per query
│   └── mutations/        writes — one file per mutation
├── lib/                  feature logic: server-only reads/orchestration
│                          ("server-only" / "use server"), pure view logic
└── ui/
    ├── index.tsx          RSC entry point — the only thing app/ imports
    ├── components/
    └── hooks/
```

- `db/` is the only place that touches Postgres.
- `lib/` server-only files declare it explicitly; pure/isomorphic logic
  doesn't.
- `utils/` is optional — only genuinely domain-agnostic helpers.

Non-infra code shared **across** features lives in root
`features/{constants,components,hooks,utils}/`, not in any one feature.
Infra shared by every feature (DB client, HTTP clients) lives in `@/lib/`.

## Import rules

- Every import uses the `@/...` alias — no relative paths
  (eslint-enforced, autofixable).
- **Feature isolation:** a file in `features/<f>` may import its own
  feature, `@/lib`, and the shared root folders — never another feature
  directly.

## Testing

Vitest, two projects (`vitest.config.mts`): `unit` (no DB, sub-second) and
`integration` (`*.integration.test.ts`, a throwaway `postgres:17`
testcontainer per run). `npm test` runs both; `npm run test:unit` runs
just the fast one.

## Contribution workflow

- Work on a branch; `main` requires a PR and a passing `test` CI check
  (branch protection, no direct pushes).
- Commit subjects must start with an approved verb — **Add, Cut, Fix,
  Bump, Make, Start, Stop, Refactor, Reformat, Optimize, Document** —
  enforced in CI and locally (`.githooks/commit-msg`, wired up by
  `npm install`).
- `docs/` is git-tracked and public-facing; it also holds superpowers
  plans/specs at their default path.
