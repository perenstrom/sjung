/** Env vars naming a disposable Postgres database that test tooling may migrate, write to or wipe. */
export const DISPOSABLE_DATABASE_ENV_VARS = ["TEST_DATABASE_URL"] as const;

export type DisposableDatabaseEnvVar = (typeof DISPOSABLE_DATABASE_ENV_VARS)[number];

export function isDisposableDatabaseEnvVar(name: string | undefined): name is DisposableDatabaseEnvVar {
  return (DISPOSABLE_DATABASE_ENV_VARS as readonly (string | undefined)[]).includes(name);
}

/**
 * The URL of a disposable test database, or a thrown error saying how to set it up.
 * Never DATABASE_URL: test tooling must not touch the dev database.
 */
export function requireDisposableDatabaseUrl(envVar: DisposableDatabaseEnvVar): string {
  const url = process.env[envVar];
  if (!url) {
    throw new Error(
      `${envVar} is not set. Add it to .env, pointing at a disposable Postgres ` +
        "database, before running these tests — see docs/testing-access-rights.md.",
    );
  }
  return url;
}
