# EU Trade Explorer

Interactive dashboards for EU customs trade data, focused on fertilizer imports.

## Stack

Next.js 16 · TypeScript · Drizzle ORM + Postgres (Neon in production) · Tailwind CSS · D3 · Vitest.

## Local development

1. Copy `.env.local.example` to `.env.local` and fill in `DATABASE_URL` / `CRON_SECRET`.
2. Start local Postgres: `docker compose up -d`
3. Install dependencies: `npm install`
4. Run migrations: `npm run db:migrate`
5. Start the dev server: `npm run dev`, then open <http://localhost:3000>

The database isn't seeded automatically. In order to seed it, run the following script:

```bash
npx tsx --conditions=react-server --env-file=.env.local scripts/sync-comext.ts --backfill  # full history, 2010 → now
```

Data comes from the [EU Comext API](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/comext-database). See the [methodology doc](docs/methodology.md) for more information.

## Testing

```bash
npm test          # everything, including a throwaway Postgres via testcontainers
npm run test:unit # fast subset, no database
npm run lint
```

## Project structure & conventions

See [.claude/PROJECT.md](.claude/PROJECT.md) for how the codebase is organized and how contributions (branches, CI, commit messages) work.