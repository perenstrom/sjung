# Testing strategy

How Sjung is tested: which layer a test belongs in, what it asserts, and how much of it to write. Read this before writing or changing a test. The integration harness (test database, identity seam, fakes) and the access-rights matrix are in `docs/testing-access-rights.md`.

## Behaviour, not implementation

A test earns its place by going **red** when a user-visible or caller-visible behaviour breaks, and staying green through a refactor that keeps that behaviour. Assert on outcomes:

- a returned value or a thrown error and its Swedish message
- rows in the test database after a server action
- the text a view renders
- what `sentEmails()`, `storedKeys()` and `convertedScores()` report from the fakes

Mock only at a **boundary** Sjung does not own, and only with the seams that already exist:

| Boundary                                           | Seam                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Session (`@/auth`)                                 | `actAs` / `actAsAnonymous` in `__tests__/support/session.ts`                                         |
| Email (`@/lib/email`)                              | the fake in `__tests__/support/fake-email.ts`, installed for every integration test                  |
| Object storage (`@/lib/object-storage`)            | the fake in `__tests__/support/fake-object-storage.ts`, installed for every integration test         |
| Next runtime (`next/cache`, `next/navigation`)     | `vi.mock` per file                                                                                   |
| Server actions imported by a view under unit test  | `vi.mock` of the actions module per file, since it reaches the database                              |
| MuseScore CLI (the converter worker)               | `MUSESCORE_COMMAND` pointed at `workers/musescore-converter/fake-musescore.mjs`                      |
| The converter worker (`@/lib/musescore-converter`) | the HTTP fake in `__tests__/support/fake-musescore-converter.ts`, started for every integration test |
| `after` from `next/server`                         | `vi.mock` per file with `__tests__/support/after.ts`, then `runAfterTasks()`                         |

Sjung's own code (`lib/*`, server actions, Prisma) runs for real. A test that mocks the module it tests, or whose main assertion is `toHaveBeenCalledWith` on Sjung's own function, tests the mock, so rewrite it to assert the outcome instead. A call assertion is right only at a boundary whose effect cannot be observed otherwise, for example `revalidatePath`, and even then fakes like `sentEmails()` come first.

## Layers

Put each behaviour in the **lowest** layer that can go red on it, and test it in that layer only. If an integration test already proves a rule, an e2e test does not prove it again.

### Unit (`npm run test:unit`)

Vitest in Node, no database, co-located as `*.test.ts` next to the code.

- Pure or mostly pure logic: parsing, formatting, sorting, slugs, policy functions (`lib/group-access-policy.ts`), URL and header building.
- Code that needs a browser API Node lacks, such as `DOMParser` for MusicXML (`lib/player/musicxml-score.test.ts`): mark the file `// @vitest-environment jsdom` rather than faking the API.
- What a view shows for a given input (an empty state, sort order, which actions appear in edit mode): render with `renderMarkup` / `textOf` from `lib/testing/markup.ts` and assert on the text.

### Integration (`npm run test:integration`)

Server actions and route handlers called directly against a real, disposable Postgres, under `__tests__/integration/`.

- Access rights: allow/deny per Member kind, cross-Group isolation. Write these as one table per rule (see `group-access.test.ts`, `find-in-group.test.ts`), not one file per case.
- Mutations and their side effects: rows written or removed, emails sent, objects stored or deleted, failure paths through `failEmailsTo` / `failDeletesOf`.
- Build data with the builders in `__tests__/support/fixtures.ts`; each test starts from an empty database.

### End-to-end (`npm run test:e2e`)

Playwright in Chromium against a production build and its own database, under `e2e/` (setup in `docs/testing-access-rights.md`). The tests so far are the auth smoke and the first step of password reset, and CI runs them on every PR and push to `main` (the `e2e` job). Tests read the emails the app sends with `latestEmailTo(address)` from `e2e/support/outbox.ts`; the running server writes them to a local outbox folder instead of sending them. The rest of the rollout is tracked under PER-429 in Linear: the journeys and interactions in PER-425, PER-426 and PER-428.

E2E covers only what the lower layers cannot see because it happens in the browser: sign-in cookies and redirects, multi-page journeys that click through an email link, drag-and-drop and other client interactions, and the phone-width layout. Each e2e test is one user **journey** that ends on something a user sees. The many cases of a rule (every role, every content kind) stay in the integration tables; e2e checks one case to prove the parts are connected.

## Budget

Every test runs on every PR, and integration files run one at a time against a shared database (`fileParallelism: false`), so each test adds time to CI.

- One test per behaviour. Before adding one, search for an existing test of the same behaviour and extend its table instead.
- Prefer a unit test when the behaviour needs no database.
- Leave to the tools what they already check: types to `tsc`, lint rules to ESLint, Prisma, Next and library behaviour to their own projects.
- A bug fix gets the one test that went red on the bug, at the lowest layer that reproduces it.
- E2E tests are the slowest and most likely to flake. Add one only for a journey on the PER-429 list or one that has broken in production.

### Pruning

When streamlining existing tests, apply these rules:

1. Same behaviour in two files or two layers: keep it once, closest to the code that owns the rule. Higher-level tests keep only what is new at their level (access rights, form-to-argument mapping, wiring side effects). For a form schema, test the public parser a caller uses (the `parse…FormData` wrapper where one exists), not the schema behind it.
2. `it` blocks that differ only in input become one `it.each` table, for example one `[parser, field, Swedish message]` table for a file's trim-and-required field parsers.
3. `toHaveBeenCalledWith` on Sjung's own code: assert the outcome instead, or delete it if another test already covers it.
4. Markup structure or class-name assertions: assert visible text instead.
5. Tests of what `tsc`, zod, Prisma or Next guarantee: delete, unless the test is the only one pinning a Swedish error message.
6. Several assertions in one test that go red for the same break: keep the most telling one (obvious cases only).
7. Tests of test-support code: keep at most one or two.
8. One rule run across variants that can't affect it (every mode × every layout): run it once.

**No coverage loss.** Every behaviour that goes red today must still go red. Before deleting a test, break the code it covers, see a surviving test go red, and revert. A test that seems not worth having but is the only one covering its behaviour stays; list it in the PR description for the maintainer to decide.
