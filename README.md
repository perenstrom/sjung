# Sjung

Sjung is a Next.js app for choir administration and repertoire workflows, including song
catalog management, people/role handling, and related planning data.

## Prerequisites

- Node.js `22` (from `.nvmrc`)
- npm (bundled with Node.js)
- PostgreSQL (local or remote)

## Environment setup

Copy `.env.example` to `.env` and set all variables:

```bash
cp .env.example .env
```

Required variables (from `.env.example`):

- `DATABASE_URL`
- `TEST_DATABASE_URL` (only needed for `npm run test:integration` — see "Testing Strategy" below)
- `AUTH_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`

## Local bootstrap

Run these commands from project root:

```bash
nvm use
npm install
cp .env.example .env
npm run db:migrate:dev
npm run db:seed
npm run dev
```

App runs at `http://localhost:3000`.

## Useful commands

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run linting
- `npm run test:unit` - run unit tests once
- `npm run test:unit:watch` - run unit tests in watch mode
- `npm run test:integration` - apply migrations to `TEST_DATABASE_URL` and run the DB-backed integration suite once
- `npm run test:integration:watch` - run the integration suite in watch mode (run `test:integration` at least once first)
- `npm run db:migrate:dev` - create/apply development migration
- `npm run db:migrate:deploy` - apply migrations in deploy environments
- `npm run db:migrate:reset` - reset database and re-apply migrations
- `npm run db:push` - push schema without creating migrations
- `npm run db:seed` - seed database
- `npm run db:studio` - open Prisma Studio

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type** — one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **scope** — optional, the area touched (e.g. `feat(auth): ...`).
- **description** — imperative, lower case, no trailing period.
- **Linear ticket** — Linear's GitHub integration auto-completes an issue whenever a PR whose branch name or commit references that issue's ID gets merged, regardless of whether that PR actually implements the fix. So the bare `(PER-XXX)` suffix, and that ticket's Linear-suggested branch name, are reserved for the commit/PR that actually finishes the work:
  - **Closing commit** (implements/finishes the ticket) — use the ticket's Linear-suggested branch name and append its ID in parentheses, e.g. `fix(auth): correct token refresh (PER-42)`.
  - **Non-closing commit** (docs, ADRs, research, triage notes that relate to a ticket without finishing it) — do not use that ticket's Linear-suggested branch name. Reference the ticket in the commit body as `Refs PER-XXX` instead of the parenthetical suffix, so merging it doesn't auto-complete the issue.
- **Breaking changes** — mark with `!` after the type/scope (`feat(api)!: ...`) and explain in a `BREAKING CHANGE:` footer.

## Pull requests

Write PR descriptions in plain paragraphs and standard Markdown lists — don't insert manual line breaks inside a paragraph (e.g. one sentence or clause per line). GitHub's mobile app wraps each hard-broken line as its own block, so a paragraph written with mid-sentence breaks reads as a staircase of fragments on a phone. Let paragraphs wrap naturally; only start a new line for an actual new paragraph or list item. The same applies to this README and other Markdown docs in the repo — don't hard-wrap prose at a fixed column, let each paragraph/list item be one line in the source.

Don't attribute PRs to Claude and don't link the session that produced them — no "Generated with Claude Code" footer, no `Co-Authored-By: Claude` trailer, and no session/transcript links in the PR title, body, or commit messages.

## Testing Strategy

Unit tests in Sjung focus on deterministic logic first: pure helpers, parsing, transformations,
and domain rules that do not require network, database, or framework runtime.

- Test first: `lib/*` modules with pure or mostly pure logic.
- Prefer not mocking for unit tests; only mock when isolating unavoidable external boundaries.
- Keep tests co-located as `*.test.ts` next to the implementation file.
- Use the canonical CI/local command: `npm run test:unit`.
- Use watch mode while developing: `npm run test:unit:watch`.

Integration tests cover DB-backed access-rights/authz logic against a real, disposable Postgres database. See `docs/testing-access-rights.md` for the full strategy and DB lifecycle (migrations, per-test reset, and shared fixture builders).

- Keep tests under `__tests__/integration/**/*.test.ts`; shared support code (test DB client, fixtures) lives in `__tests__/support/`.
- Set `TEST_DATABASE_URL` in `.env` before running them.
- Use `npm run test:integration`.
