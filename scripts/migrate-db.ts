import "dotenv/config";
import { spawnSync } from "node:child_process";
import {
  DISPOSABLE_DATABASE_ENV_VARS,
  isDisposableDatabaseEnvVar,
  requireDisposableDatabaseUrl,
} from "../lib/testing/disposable-database-url";

// Applies Prisma migrations to the disposable database named by the first
// argument. Only the test databases are accepted, never DATABASE_URL.
const envVar = process.argv[2];

if (!isDisposableDatabaseEnvVar(envVar)) {
  console.error(`Usage: tsx scripts/migrate-db.ts <${DISPOSABLE_DATABASE_ENV_VARS.join(" | ")}>`);
  process.exit(1);
}

let databaseUrl: string;
try {
  databaseUrl = requireDisposableDatabaseUrl(envVar);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});

process.exit(result.status ?? 1);
