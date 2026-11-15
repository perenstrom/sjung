import "dotenv/config";
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { Client } from "pg";
import { requireDisposableDatabaseUrl } from "@/lib/testing/disposable-database-url";

export type VerifiedCreator = { email: string; password: string; groupSlug: string };

/**
 * A Verified user who is Creator, and so a Member, of their own Group, written
 * straight to the e2e database. The e2e database is never reset, so email and
 * slug are random rather than counted, and rows from earlier runs are left behind.
 *
 * Plain SQL rather than the Prisma client: Prisma's generated client is
 * ES-module-only, and Playwright loads this package's TypeScript as CommonJS.
 * Columns Prisma fills in itself (ids, updated_at) are set here by hand.
 */
export async function createVerifiedCreator(): Promise<VerifiedCreator> {
  const id = randomUUID();
  const userId = randomUUID();
  const groupId = randomUUID();
  const email = `e2e-${id}@test.local`;
  const password = `e2e-password-${id}`;
  const groupSlug = `e2e-${id}`;
  const passwordHash = await argon2.hash(password);

  const client = new Client({ connectionString: requireDisposableDatabaseUrl("E2E_DATABASE_URL") });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO users (id, updated_at, name, email, password_hash, email_verified_at)
       VALUES ($1, now(), 'E2E User', $2, $3, now())`,
      [userId, email, passwordHash],
    );
    await client.query(
      `INSERT INTO groups (id, updated_at, created_by_id, updated_by_id, name, slug)
       VALUES ($1, now(), $2, $2, 'E2E Group', $3)`,
      [groupId, userId, groupSlug],
    );
    // Creator ⇒ Member, as in app/actions/groups.ts.
    await client.query(`INSERT INTO users_to_groups (user_id, group_id) VALUES ($1, $2)`, [
      userId,
      groupId,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  return { email, password, groupSlug };
}
