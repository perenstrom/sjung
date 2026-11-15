# Testing strategy

How Sjung is tested: which layer a test belongs in, what it asserts, and how much of it to write. Read this before writing or changing a test. The integration harness (test database, identity seam, fakes) and the access-rights matrix are in `docs/testing-access-rights.md`.

## Behaviour, not implementation

A test earns its place by going **red** when a user-visible or caller-visible behaviour breaks, and staying green through a refactor that keeps that behaviour. Assert on outcomes:

- a returned value or a thrown error and its Swedish message
- rows in the test database after a server action
- the text a view renders
- what `sentEmails()` and `storedKeys()` report from the fakes

Mock only at a **boundary** Sjung does not own, and only with the seams that already exist:

| Boundary | Seam |
| --- | --- |
| Session (`@/auth`) | `actAs` / `actAsAnonymous` in `__tests__/support/session.ts` |
| Email (`@/lib/email`) | the fake in `__tests__/support/fake-email.ts`, installed for every integration test |
| Object storage (`@/lib/object-storage`) | the fake in `__tests__/support/fake-object-storage.ts`, installed for every integration test |
| Next runtime (`next/cache`, `next/navigation`) | `vi.mock` per file |
| Server actions imported by a view under unit test | `vi.mock` of the actions module per file, since it reaches the database |

Sjung's own code (`lib/*`, server actions, Prisma) runs for real. A test that mocks the module it tests, or whose main assertion is `toHaveBeenCalledWith` on Sjung's own function, tests the mock, so rewrite it to assert the outcome instead. A call assertion is right only at a boundary whose effect cannot be observed otherwise, for example `revalidatePath`, and even then fakes like `sentEmails()` come first.

## Layers

Put each behaviour in the **lowest** layer that can go red on it, and test it in that layer only. If an integration test already proves a rule, an e2e test does not prove it again.

### Unit (`npm run test:unit`)

Vitest in Node, no database, co-located as `*.test.ts` next to the code.

- Pure or mostly pure logic: parsing, formatting, sorting, slugs, policy functions (`lib/group-access-policy.ts`), URL and header building.
- What a view shows for a given input (an empty state, sort order, which actions appear in edit mode): render with `renderMarkup` / `textOf` from `lib/testing/markup.ts` and assert on the text.

### Integration (`npm run test:integration`)

Server actions and route handlers called directly against a real, disposable Postgres, under `__tests__/integration/`.

- Access rights: allow/deny per Member kind, cross-Group isolation. Write these as one table per rule (see `group-access.test.ts`, `find-in-group.test.ts`), not one file per case.
- Mutations and their side effects: rows written or removed, emails sent, objects stored or deleted, failure paths through `failEmailsTo` / `failDeletesOf`.
- Build data with the builders in `__tests__/support/fixtures.ts`; each test starts from an empty database.

### End-to-end (Playwright, being set up)

Playwright is not installed yet. The rollout is tracked under PER-429 in Linear: the auth smoke (PER-194) first, then CI (PER-347), reading sent email (PER-424), and the journeys and interactions in PER-425, PER-426 and PER-428.

E2E covers only what the lower layers cannot see because it happens in the browser: sign-in cookies and redirects, multi-page journeys that click through an email link, drag-and-drop and other client interactions, and the phone-width layout. Each e2e test is one user **journey** that ends on something a user sees. The many cases of a rule (every role, every content kind) stay in the integration tables; e2e checks one case to prove the parts are connected.

## Budget

Every test runs on every PR, and integration files run one at a time against a shared database (`fileParallelism: false`), so each test adds time to CI.

- One test per behaviour. Before adding one, search for an existing test of the same behaviour and extend its table instead.
- Prefer a unit test when the behaviour needs no database.
- Leave to the tools what they already check: types to `tsc`, lint rules to ESLint, Prisma, Next and library behaviour to their own projects.
- A bug fix gets the one test that went red on the bug, at the lowest layer that reproduces it.
- E2E tests are the slowest and most likely to flake. Add one only for a journey on the PER-429 list or one that has broken in production.
