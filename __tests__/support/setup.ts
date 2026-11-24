import { beforeAll, beforeEach, afterAll, vi } from "vitest";
import { testPrisma, resetDatabase } from "./db";
import { resetFakeEmail } from "./fake-email";
import {
  resetFakeMuseScoreConverter,
  startFakeMuseScoreConverter,
  stopFakeMuseScoreConverter,
} from "./fake-musescore-converter";
import { resetFakeObjectStorage } from "./fake-object-storage";

// Global so no integration test can send real email, even with
// RESEND_API_KEY set in .env (loaded via dotenv/config in ./db).
vi.mock("@/lib/email", () => import("./fake-email"));

// Global so no integration test can reach real storage, even with the R2_*
// variables set in .env.
vi.mock("@/lib/object-storage", () => import("./fake-object-storage"));

// Started for every file so no integration test can reach a real converter,
// even with MUSESCORE_CONVERTER_URL set in .env.
beforeAll(async () => {
  await startFakeMuseScoreConverter();
});

beforeEach(async () => {
  await resetDatabase();
  resetFakeEmail();
  resetFakeObjectStorage();
  resetFakeMuseScoreConverter();
});

afterAll(async () => {
  await stopFakeMuseScoreConverter();
  await testPrisma.$disconnect();
});
