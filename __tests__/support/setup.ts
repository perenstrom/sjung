import { beforeEach, afterAll } from "vitest";
import { testPrisma, resetDatabase } from "./db";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
