import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests require a disposable " +
      "Postgres database — see docs/testing-access-rights.md for setup.",
  );
}

// App code (lib/prisma.ts) reads DATABASE_URL — point it at the test DB so
// actions under test never touch the dev database.
process.env.DATABASE_URL = connectionString;

const adapter = new PrismaPg({ connectionString });

export const testPrisma = new PrismaClient({ adapter });

// Keep in sync with the @@map(...) table names in prisma/schema.prisma —
// a table missing here won't be reset between tests.
const TABLES = [
  "users",
  "groups",
  "users_to_groups",
  "pieces",
  "links",
  "files",
  "people",
  "people_to_pieces",
  "set_lists",
  "set_list_pieces",
  "piece_notes",
  "set_list_piece_notes",
  "set_list_notes",
];

export async function resetDatabase() {
  const tableList = TABLES.map((table) => `"${table}"`).join(", ");
  await testPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
  );
}
