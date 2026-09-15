import { defineConfig } from "drizzle-kit";

// DATABASE_URL is sourced from the environment (App Service app_settings
// in production, an ephemeral local/CI Postgres in dev - never a literal
// here; see root AGENTS.md Zero Hardcoded Secrets and ADR-0004).
export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
