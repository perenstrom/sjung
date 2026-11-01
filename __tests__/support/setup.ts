import { beforeEach, afterAll, vi } from "vitest";
import { testPrisma, resetDatabase } from "./db";
import { resetFakeEmail } from "./fake-email";

// Global so no integration test can send real email, even with
// RESEND_API_KEY set in .env (loaded via dotenv/config in ./db).
vi.mock("@/lib/email", () => import("./fake-email"));

beforeEach(async () => {
  await resetDatabase();
  resetFakeEmail();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
