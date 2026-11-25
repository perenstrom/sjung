# Access rights and the integration harness

What the access-rights tests cover, and how the integration harness works: identity, test database lifecycle, and the email and object-storage fakes. The last section covers the Playwright smoke test. Which layer a test belongs in and how much to test is in `docs/testing.md`.

## Seam agreement

Sjung has no static seam catalog — per the `tdd` skill, seams are agreed live per session before writing any test, not read off a fixed list.

## Current architecture notes

- `proxy.ts` (Next's route guard, formerly `middleware.ts`) redirects anonymous requests under `/app` to login, checking only that a session token exists. Its unit test is `proxy.test.ts`.
- Authorization is implemented in server code, mainly through:
  - `requireUser()` in `lib/auth/require-user.ts`
  - Tenant membership checks, and `runContentMutation` for every content change, in `lib/tenant-group.ts`
  - The in-Group content lookup `findInGroup` in `lib/find-in-group.ts`
  - Server actions in `app/actions/*`
  - Tenant layout gating in `app/app/[groupSlug]/layout.tsx`
- `lib/pieces/credit-roles.ts` is for music Credit roles (for example `Kompositör` and `Arrangör`) and is not RBAC for app authorization.

## Access-right scope and allow/deny intent

Use this scope as the baseline coverage matrix:

1. Authentication (`requireUser`)
   - Allow: signed-in request with a valid user id.
   - Deny: anonymous/invalid session (expect unauthorized error path).
   - Deny: signed-in Unverified user (expect "E-postadressen är inte bekräftad"). The verified state is read from the database on every call, never from the JWT.
2. Tenant membership (`requireTenantGroup`, `getWritableGroupIdForSlug`)
   - Allow: user is a member of the target group slug.
   - Deny: non-member or invalid slug (expect not-found or explicit permission error depending on helper).
3. In-Group content lookup (`findInGroup` in `lib/find-in-group.ts`). One table of content kinds × (in this Group / in another Group / missing) in `__tests__/integration/find-in-group.test.ts` covers it.
   - Allow: the row exists and belongs to the caller's resolved group.
   - Deny: the row is missing or in another Group (expect its Swedish "hittades inte" error).
4. Group access capabilities (`lib/group-access.ts`). One table of Member kinds × capabilities in `__tests__/integration/group-access.test.ts` covers them.
   - `manageContent` (create, edit or delete the Group's content, checked once per action by `runContentMutation`): allow the Creator, or a Member holding `MANAGE_CONTENT` in that Group; deny a Member holding no Claim or only `MANAGE_MEMBERS` (ADR-0004). `__tests__/integration/manage-content.test.ts` sweeps every exported content action, so an action that skips `runContentMutation` fails there. The exceptions are the actions a fine-grained Claim also allows (ADR-0012), which name it in `runContentMutation`'s `alsoAllowedBy`: `reorderSetListSteps` also accepts `reorderSetLists`, and `appendSetListNote`, `updateSetListNote` and `deleteSetListNote` also accept `manageRunningOrderNotes`.
   - `reorderSetLists` (change the order of any of the Group's Set lists' steps): allow the Creator, or a Member holding `REORDER_SET_LISTS` in that Group; `reorderSetListSteps` also allows `manageContent`. A Member holding only `REORDER_SET_LISTS` is refused every other content action (ADR-0012). Covered in the same sweep.
   - `manageRunningOrderNotes` (add, edit and delete the Running-order notes in any of the Group's Set lists): allow the Creator, or a Member holding `MANAGE_RUNNING_ORDER_NOTES` in that Group; the three note actions also allow `manageContent`. A Member holding only `MANAGE_RUNNING_ORDER_NOTES` is refused every other content action, reordering included (ADR-0012). Covered in the same sweep.
   - `manageGroup` (rename and delete the Group): allow the Creator only; deny a Member even when holding Claims.
   - `viewMembers` (open the members page and list Members with their Claims): allow the Creator, or a Member holding `MANAGE_MEMBERS` or `MANAGE_MEMBER_AUTHORIZATION` in that Group (ADR-0013).
   - `manageMembers` (invite, list/revoke/resend Invitations): allow the Creator, or a Member holding `MANAGE_MEMBERS` in that Group; deny a Member holding no Claim, only `MANAGE_CONTENT` or only `MANAGE_MEMBER_AUTHORIZATION`.
   - `removeMember(target)`: `MANAGE_MEMBERS` (or the Creator), and the target is neither the Creator nor the viewer.
   - `changeMemberClaims(target)` (grant/revoke any Claim): `MANAGE_MEMBER_AUTHORIZATION` (or the Creator), and the target is neither the Creator nor the viewer, so the Creator never has Claims granted/revoked. A Member holding only `MANAGE_MEMBERS` is refused (ADR-0013).
5. Representative server-action surfaces (`app/actions/*`)
   - Allow: valid member/creator calls succeed and mutate/read as expected.
   - Deny: cross-tenant or under-privileged calls fail before writes.

## Vitest identity strategy

Use a deterministic auth seam in integration tests:

- Mock `auth()` from `@/auth` (or expose an equivalent test-only seam) so tests can explicitly run as:
  - anonymous
  - member user
  - non-member user
  - creator user
- Keep this identity control in test setup utilities (`actAs` / `actAsAnonymous` in `__tests__/support/session.ts`) so each test describes identity in one line and avoids HTTP login ceremony.

Why:

- Fast and deterministic.
- Makes guard-path tests focused on authorization logic instead of login mechanics.
- Avoids coupling every integration test to browser/session setup.

## Tooling and scripts

- `npm run test:unit` for pure unit tests (fast, always required).
- `npm run test:integration` for DB-backed integration/authz tests.
- `npm run test:integration:watch` for the integration suite in watch mode (skips the migration step below — run `test:integration` at least once first).

Environment expectations:

- Set `TEST_DATABASE_URL` in `.env`, pointing at a disposable local Postgres database (for example `sjung_test`, created once with `createdb sjung_test`). Integration tests fail fast with a clear error if it's unset. The harness (`__tests__/support/db.ts`) also sets `DATABASE_URL` to it for the run, so app code under test (`lib/prisma.ts`) uses the test database too, never your dev database.
- Unit and integration suites are configured separately (`vitest.config.ts` and `vitest.integration.config.ts`) so `test:unit` never picks up DB-backed tests and vice versa.
- CI: the `Integration Tests` job in `.github/workflows/ci.yml` runs the integration suite on every PR and push to `main`, against a Postgres service container provisioned per job (no external DB, no secrets). It is a required, merge-blocking check, separate from the `build` job that runs lint, typecheck, unit tests and the production build.

## DB lifecycle for integration tests

- **Migrations**: `npm run test:integration` runs `db:migrate:deploy:test` first, which applies `prisma migrate deploy` against `TEST_DATABASE_URL` (via `scripts/migrate-db.ts`) before the suite runs. This keeps the test DB's schema current without a separate manual step.
- **Reset strategy**: a global Vitest `setupFiles` hook (`__tests__/support/setup.ts`) truncates every app table (`RESTART IDENTITY CASCADE`) before each test, so every test starts against an empty database regardless of what earlier tests left behind. There is no per-suite seed step — tests build exactly the rows they need via fixtures.
- **Fixtures**: shared, hand-rolled builder functions live in `__tests__/support/fixtures.ts` (no fishery/faker — see PER-299's resolution). Builders are persist-only (`createUser`, `createGroup`, `createPiece` each insert and return the row) and auto-create any missing parent chain (for example `createPiece()` with no `groupId` creates a user, then a group, then the piece), while accepting overrides for tests that care about a specific chain. `User.email` and `Group.slug` are generated from deterministic module-level counters, not random data. `createGroup()` mirrors the app's creator⇒member invariant (`app/actions/groups.ts`) by giving the creator a `UsersToGroups` row too. `createAccessScenario()` composes a group with a creator, a distinct member, and a non-member (zero `UsersToGroups` rows) in one call, for the four-role matrix used across PER-191–193.

## Email in tests

- **Wrapper**: features send email through `sendEmail({ to, subject, react })` in `lib/email.ts`, one recipient per send. It throws on failure. Its own unit test (`lib/email.test.ts`) mocks `resend` in that file only.
- **Fake**: `__tests__/support/fake-email.ts` replaces `@/lib/email` for every integration test through `vi.mock` in `__tests__/support/setup.ts`, so no integration test can send real email, even with `RESEND_API_KEY` in `.env`. It is reset in the same `beforeEach` as the database.
- **Reading what was sent**: `sentEmails()` returns `{ to, subject, react, text }` for each send, in order. `text` is the template rendered as plain text with React Email's `render(react, { plainText: true })`, so a template that crashes while rendering fails the test. Assert on `text` by default (for example, to pull out a verification link) and on `react.props` only when the rendered text isn't enough.
- **Failure injection**: `failEmailsTo(address)` makes every later send to that recipient throw, like a real Resend error. Sends to other recipients still go through.
- **Unit tests** that reach `sendEmail` mock `@/lib/email` per file, the same way they mock `@/auth`.

## Object storage in tests

- **Module**: all R2 access goes through `lib/object-storage.ts` (sign a PUT or GET, head, delete keys, delete a prefix). Features reach it through the Piece file store (`lib/pieces/file-store.ts`), never directly.
- **Fake**: `__tests__/support/fake-object-storage.ts` replaces `@/lib/object-storage` for every integration test through `vi.mock` in `__tests__/support/setup.ts`, so no integration test can reach real storage, even with the `R2_*` variables in `.env`. It is reset in the same `beforeEach` as the database.
- **Uploading**: signed URLs are only recognisable strings. To stand in for the browser's PUT, sign the upload through the action and then call `putStoredObject(storagePath, { size, contentType }, body?)`. `storedKeys()` lists what is left in storage, and `storedBody(key)` what an object holds.
- **Failure injection**: `failDeletesOf(key)` makes every later delete of that key fail, like a real R2 error. The object stays.

## MuseScore converter in tests

- **Module**: the app reaches the converter worker (ADR-0009) only through `lib/musescore-converter.ts`, called by `convertFile` in the Piece file store, which the file actions schedule with `after` from `next/server`.
- **Fake**: `__tests__/support/fake-musescore-converter.ts` is a real HTTP server on a free local port, started for every integration test file by `__tests__/support/setup.ts`, which points `MUSESCORE_CONVERTER_URL` at it. The app's client runs for real against it. It answers a score with `CONVERTED_PREFIX` followed by the score's bytes, and is reset in the same `beforeEach` as the database. `convertedScores()` lists the scores it was sent.
- **Running conversions**: `after` only works inside a Next request, so a test file that finalizes a MuseScore upload swaps it for `__tests__/support/after.ts` (see the comment there) and runs the scheduled conversions with `runAfterTasks()`.
- **Failure injection**: `failConversionsWith(status)` makes it answer with an error, like MuseScore failing; `makeConverterUnreachable()` points the app where nothing answers; `holdConversions()` holds conversions until released, to change a File while it is being converted.

## Playwright smoke

The browser tests cover what the integration suite can't. `e2e/auth-smoke.spec.ts` covers the session cookie and the redirects around login. An anonymous visitor opens a Group's address, `proxy.ts` sends them to `/auth/login?next=/app/<groupSlug>`, they sign in through the real form, and they land on the Group's Home. Other access rules (non-Members, Claims, cross-Group isolation) stay in the integration tables. `e2e/password-reset.spec.ts` covers the first step of password reset: a Verified user asks for a reset link in the browser and receives an email with it (see **Email** below).

- **Database**: Playwright uses its own disposable Postgres, set by `E2E_DATABASE_URL` in `.env` (for example `sjung_e2e`, created once with `createdb sjung_e2e`). It is separate from `TEST_DATABASE_URL` because the integration suite truncates that one, and the two suites would wipe each other's rows. Neither the tests nor the server they start touch `DATABASE_URL`'s dev data: `playwright.config.ts` sets the server's `DATABASE_URL` to `E2E_DATABASE_URL`, and fails fast if it is unset. The same guard, `requireDisposableDatabaseUrl` in `lib/testing/disposable-database-url.ts`, protects the integration harness and `scripts/migrate-db.ts`, which accepts only `TEST_DATABASE_URL` or `E2E_DATABASE_URL`.
- **Migrations**: `npm run test:e2e` runs `db:migrate:deploy:e2e` first, which applies `prisma migrate deploy` against `E2E_DATABASE_URL`.
- **Server**: Playwright's `webServer` runs `npm run build && npm run start` on port 3100, a production build, so a first run takes a minute or two. It is not port 3000, so a running `npm run dev` on the dev database is never mistaken for it. Locally, a server already listening on 3100 is reused (start one yourself with `E2E_DATABASE_URL` as `DATABASE_URL` to skip the build between runs); in CI it is always started fresh. The server needs `AUTH_SECRET`; the config sets `AUTH_TRUST_HOST=true`, which Auth.js requires under `next start`. R2 and Resend are not needed on this path.
- **Data**: there is no seed. Each test creates exactly the rows it needs with `createVerifiedCreator()` in `e2e/support/members.ts`: a Verified user (verification is set in the database, so no email is read) with a known password, argon2-hashed as the credentials provider expects, who is Creator, and so a Member, of their own Group. The e2e database is never reset, so emails and slugs are random UUIDs rather than the integration fixtures' counters, and rows pile up across runs, which is fine for a disposable database. The helper writes with `pg` rather than Prisma because Prisma's generated client is ES-module-only and Playwright loads the repo's TypeScript as CommonJS.
- **Email**: the server never sends real email. `playwright.config.ts` sets `EMAIL_OUTBOX_DIR` to `.e2e-outbox/` at the repo root (gitignored), and `sendEmail` in `lib/email.ts` then writes each email to its own `<ISO timestamp>-<uuid>.json` file there, holding `to`, `subject`, `text` (the plain-text render), `replyTo` when there is one, and `sentAt`. The outbox is used only when `RESEND_API_KEY` is unset; with both set, `sendEmail` throws, and every deployment has a Resend key, so the outbox can't take over in staging or production. The config also passes an empty `RESEND_API_KEY` so a key in your `.env` doesn't trip that guard. A test reads mail with `latestEmailTo(address)` from `e2e/support/outbox.ts`, which waits up to 5 seconds and returns the newest email's `subject`, `text` and `links` (every `http(s)` URL in the text). A `globalSetup` (`e2e/global-setup.ts`) empties the folder at the start of each run. If you start the server on 3100 yourself, start it with `EMAIL_OUTBOX_DIR=.e2e-outbox RESEND_API_KEY=` from the repo root; without it, no email arrives and `latestEmailTo` fails with a hint about the flag.
- **Running**: `npm run test:e2e`. Chromium only (install it once with `npx playwright install chromium`), no retries locally, two in CI with a trace on the first retry. Specs live in `e2e/*.spec.ts`; Vitest ignores the folder. `test-results/` and `playwright-report/` are gitignored.
- **CI**: the `e2e` job in `.github/workflows/ci.yml` runs `npm run test:e2e` on every PR and push to `main`, against a Postgres service container with a placeholder `AUTH_SECRET`; no real secrets. Like `build`, it skips its steps (and still reports success) on docs-only changes. It is a required, merge-blocking check, and both staging and production deploys wait for it to be green. When it fails, the Playwright HTML report, with the traces from retries, is uploaded as the `playwright-report` artifact for seven days.
