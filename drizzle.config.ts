import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a standalone script, not through Next.js — it doesn't
// get Next's automatic .env.local loading, so this loads it explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schemas/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
