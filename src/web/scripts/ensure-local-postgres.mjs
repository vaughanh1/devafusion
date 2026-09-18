#!/usr/bin/env node
// Ensures a local, ephemeral Postgres 16 Docker container is running,
// has the citext extension enabled, and has every pending Drizzle
// migration applied - runs automatically before `next dev` via npm's
// `predev` lifecycle script, so `npm run dev` alone is enough for
// local development (see .env.example for the equivalent manual
// steps this replaces, kept there for CI/troubleshooting reference).

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const CONTAINER_NAME = "devafusion-dev-local";
const POSTGRES_PASSWORD = "localdev";
const POSTGRES_PORT = 5432;

function log(message) {
  process.stderr.write(`[ensure-local-postgres] ${message}\n`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Minimal .env.local parser - deliberately not the dotenv package (no
// new dependency for ~15 lines of parsing). Only used by this script;
// drizzle.config.ts and production code still source DATABASE_URL
// from the real environment per root AGENTS.md's Zero Hardcoded
// Secrets rule - this only fills in process.env for the child
// `drizzle-kit migrate` this script itself spawns below.
function loadEnvLocal() {
  const envPath = path.join(WEB_ROOT, ".env.local");
  if (!existsSync(envPath)) {
    log(
      ".env.local not found - copy .env.example to .env.local and fill in real values first.",
    );
    process.exit(1);
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function containerStatus() {
  try {
    return execFileSync(
      "docker",
      ["inspect", "-f", "{{.State.Status}}", CONTAINER_NAME],
      { stdio: ["ignore", "pipe", "ignore"] },
    )
      .toString()
      .trim();
  } catch {
    return null; // container doesn't exist yet
  }
}

function ensureContainer() {
  const status = containerStatus();

  if (status === "running") {
    log(`${CONTAINER_NAME} already running.`);
    return;
  }

  if (status === null) {
    log(`Creating ${CONTAINER_NAME}...`);
    execFileSync(
      "docker",
      [
        "run",
        "--name",
        CONTAINER_NAME,
        "-e",
        `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
        "-p",
        `${POSTGRES_PORT}:5432`,
        "-d",
        "postgres:16",
      ],
      { stdio: "inherit" },
    );
    return;
  }

  log(`Starting existing ${CONTAINER_NAME} (was ${status})...`);
  execFileSync("docker", ["start", CONTAINER_NAME], { stdio: "inherit" });
}

function waitForReady(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      execFileSync(
        "docker",
        ["exec", CONTAINER_NAME, "pg_isready", "-U", "postgres"],
        { stdio: "ignore" },
      );
      return;
    } catch {
      sleep(500);
    }
  }
  throw new Error(
    `${CONTAINER_NAME} did not become ready within ${timeoutMs}ms`,
  );
}

function ensureCitext() {
  execFileSync(
    "docker",
    [
      "exec",
      CONTAINER_NAME,
      "psql",
      "-U",
      "postgres",
      "-c",
      "CREATE EXTENSION IF NOT EXISTS citext;",
    ],
    { stdio: "inherit" },
  );
}

function runMigrations() {
  log("Running drizzle-kit migrate...");
  execSync("npx drizzle-kit migrate", {
    cwd: WEB_ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

try {
  loadEnvLocal();
  ensureContainer();
  waitForReady();
  ensureCitext();
  runMigrations();
  log("Local Postgres ready and migrated.");
} catch (error) {
  log(error.message);
  process.exitCode = 1;
}
