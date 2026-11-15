# Access rights and the integration harness

What the access-rights tests cover, and how the integration harness works: identity, test database lifecycle, and the email and object-storage fakes. Which layer a test belongs in and how much to test is in `docs/testing.md`.

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
- `lib/roles.ts` is for music credit roles (for example `Kompositor` and `Arrangor`) and is not RBAC for app authorization.

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
   - `manageContent` (create, edit or delete the Group's content, checked once per action by `runContentMutation`): allow the Creator, or a Member holding `MANAGE_CONTENT` in that Group; deny a Member holding no Claim or only `MANAGE_MEMBERS` (ADR-0004). `__tests__/integration/manage-content.test.ts` sweeps every exported content action, so an action that skips `runContentMutation` fails there.
   - `manageGroup` (rename and delete the Group): allow the Creator only; deny a Member even when holding Claims.
   - `manageMembers` (list/invite/remove members, grant/revoke Claims): allow the Creator, or a Member holding `MANAGE_MEMBERS` in that Group; deny a Member holding no Claim or only `MANAGE_CONTENT`.
   - `changeMember(target)`: `manageMembers`, and the target is neither the Creator nor the viewer, so the Creator can never be removed or have Claims granted/revoked.
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
- **Uploading**: signed URLs are only recognisable strings. To stand in for the browser's PUT, sign the upload through the action and then call `putStoredObject(storagePath, { size, contentType })`. `storedKeys()` lists what is left in storage.
- **Failure injection**: `failDeletesOf(key)` makes every later delete of that key fail, like a real R2 error. The object stays.
