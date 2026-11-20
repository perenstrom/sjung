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
- `E2E_DATABASE_URL` (only needed for `npm run test:e2e` — see "Testing Strategy" below)
- `AUTH_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`
- `RESEND_API_KEY` (optional locally — see "Emails in local development" below)
- `EMAIL_FROM` (sender address for every email, e.g. `Sjung <noreply@per.fyi>`; optional locally)
- `FEEDBACK_EMAIL_TO` (inbox that Feedback sent from the app goes to; optional locally)
- `OPERATORS_EMAIL` (comma-separated addresses of the Operators, who publish Announcements under *Nyheter* and see the Group overview under *Drift*; empty means nobody, see ADR-0008)
- `APP_BASE_URL` (origin for links in emails, e.g. `https://www.sjung.app`; `http://localhost:3000` locally; required to send any email)
- `APP_ENV` (optional; leave empty locally — set per deployed app, see "Deploying" below)

Not in `.env.example`: `EMAIL_OUTBOX_DIR` makes the app write emails to files in that folder instead of sending them. Only the Playwright server sets it (see `docs/testing-access-rights.md`); it is refused alongside `RESEND_API_KEY`, so it never applies in staging or production.

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

### Emails in local development

With `npm run dev` and no `RESEND_API_KEY`, emails aren't sent. Each one is printed to the terminal running the dev server instead: sender, recipient, subject and the email as plain text, so links such as the verification link can be opened from there. `EMAIL_FROM` and `FEEDBACK_EMAIL_TO` can be left empty too.

To test real delivery locally, set `RESEND_API_KEY` and `EMAIL_FROM` in `.env`; emails then go through Resend as on staging and production. Set `FEEDBACK_EMAIL_TO` too to send Feedback.

Staging and production never print emails: if either variable is missing there, sending an email fails with an error. The same goes for `FEEDBACK_EMAIL_TO` when sending Feedback.

## Useful commands

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run linting
- `npm run typecheck` - type-check the project with `tsc --noEmit`
- `npm run test:unit` - run unit tests once
- `npm run test:unit:watch` - run unit tests in watch mode
- `npm run test:integration` - apply migrations to `TEST_DATABASE_URL` and run the DB-backed integration suite once
- `npm run test:integration:watch` - run the integration suite in watch mode (run `test:integration` at least once first)
- `npm run test:e2e` - apply migrations to `E2E_DATABASE_URL`, build and start the app on port 3100, and run the Playwright suite (Chromium)
- `npm run db:migrate:deploy:e2e` - apply migrations to `E2E_DATABASE_URL` only
- `npm run db:migrate:dev` - create/apply development migration
- `npm run db:migrate:deploy` - apply migrations in deploy environments
- `npm run db:migrate:reset` - reset database and re-apply migrations
- `npm run db:push` - push schema without creating migrations
- `npm run db:seed` - seed database
- `npm run db:studio` - open Prisma Studio

## Deploying

Sjung runs as two Coolify apps, `sjung-staging` ([staging.sjung.app](https://staging.sjung.app)) and `sjung-production` ([sjung.app](https://sjung.app)). Coolify's own auto-deploy is off for both; GitHub Actions is the only thing that triggers a deploy. Coolify runs `npx prisma migrate deploy` after each deploy.

- **Staging** deploys automatically when a push to `main` passes CI (the `deploy-staging` job in `.github/workflows/ci.yml`). Docs-only pushes don't deploy.
- **Production** deploys when a release PR is merged (see [Releasing](#releasing)), or when someone runs the "Deploy to production" workflow (`.github/workflows/deploy-production.yml`) by hand. Either way the workflow refuses any ref but `main`, waits until `build`, `Integration Tests` and `e2e` are green on the commit it deploys, moves the `production` branch to that commit, triggers the deploy, waits for Coolify to report it finished and fails unless Coolify deployed that exact commit.

`sjung-production` builds the `production` branch, not `main`. Coolify builds whatever its branch points to when it fetches, and a release deploy waits several minutes for CI, so tracking `main` would ship any PR merged in the meantime: unchecked, and not the release the tag and changelog describe. Only the release GitHub App can push to `production`, and only this workflow uses it.

To deploy `main`'s current HEAD by hand, run the workflow against `main`. A manual deploy doesn't wait for CI, so the checks must already be green. Tick `force` for a clean rebuild without the image cache.

```bash
gh workflow run deploy-production.yml --ref main
```

To roll back, pass an older commit on `main` whose checks are green:

```bash
gh workflow run deploy-production.yml --ref main -f sha=<commit>
```

A rollback leaves the release PR and tags as they are; the next release deploys `main` again.

Config lives in the `staging` and `production` GitHub environments: variables `COOLIFY_URL` and `COOLIFY_STAGING_APP_UUID` / `COOLIFY_PROD_APP_UUID`, and secrets `COOLIFY_STAGING_TOKEN` / `COOLIFY_PROD_TOKEN`. `COOLIFY_PROD_TOKEN` can only deploy. The release GitHub App's credentials, variable `RELEASE_APP_CLIENT_ID` and secret `RELEASE_APP_PRIVATE_KEY`, are set in both the `release` and `production` environments (see [Releasing](#releasing)).

Each Coolify app sets the runtime variable `APP_ENV`: `staging` on `sjung-staging` and `production` on `sjung-production`. It decides the environment label in the browser tab title (`[staging] Sjung` on staging, plain `Sjung` in production; `npm run dev` always shows `[local] Sjung`). An unset or unknown value counts as production.

Both apps also set four runtime variables for email, and `OPERATORS_EMAIL` for who the Operators are. Without them signup still works, but no verification email goes out and new users get stuck on the "check your email" page.

| Variable | `sjung-staging` | `sjung-production` |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend key `sjung-staging` | Resend key `sjung-production` |
| `EMAIL_FROM` | `Sjung <noreply@per.fyi>` | `Sjung <noreply@per.fyi>` |
| `APP_BASE_URL` | `https://staging.sjung.app` | `https://www.sjung.app` |
| `FEEDBACK_EMAIL_TO` | Inbox for Feedback | Inbox for Feedback |
| `OPERATORS_EMAIL` | Operators' addresses, comma-separated | Operators' addresses, comma-separated |

Each app has its own sending-only Resend key, so either can be revoked alone. The sender must be on a domain verified in Resend. Production uses `www` because `sjung.app` redirects there, and links in emails shouldn't go through a redirect. Set them as runtime variables, not build variables; a restart picks up a change.

## Releasing

Releases are cut by [release-please](https://github.com/googleapis/release-please) (`.github/workflows/release.yml`, configured in `release-please-config.json` and `.release-please-manifest.json`).

1. Every push to `main` opens or updates a single release PR titled `chore(main): release X.Y.Z`. It bumps the version in `package.json` and adds the commits since the last release to `CHANGELOG.md`. CI runs on it like on any PR.
2. To ship, merge the release PR. That tags the merge commit `vX.Y.Z`, creates a GitHub Release and calls "Deploy to production" with that commit (see [Deploying](#deploying)).

The next version comes from the Conventional Commit messages on `main`, which are the squash-merged PR titles. Below 1.0, `fix`, `perf` and `revert` give a patch bump, `feat` a minor bump, and a breaking change (`!` or `BREAKING CHANGE:`) a minor bump too. `feat`, `fix`, `perf` and `revert` show in the changelog; the other types don't, and on their own they don't create a release.

release-please opens the release PR with the release GitHub App's token, because a PR opened with the default `GITHUB_TOKEN` doesn't trigger CI and branch protection would wait forever for its checks. The first release only reads commits after `bootstrap-sha` in `release-please-config.json`, so history from before release-please isn't parsed.

### Setup

These live outside the repo and need admin access:

- **Release GitHub App** — a GitHub App installed on this repository only, with repository permissions Contents and Pull requests set to read and write. Store its client ID as the variable `RELEASE_APP_CLIENT_ID` and a private key as the secret `RELEASE_APP_PRIVATE_KEY` in both the `release` and `production` environments. Limit both environments' deployment branches to `main`, so only workflows on `main` can mint the app's token.
- **`production` branch** — create it at the commit production runs today, before the first deploy (the workflow updates the branch and fails if it's missing). Protect it so only the release app can push, force pushes included (rollbacks move it backwards), and nobody can delete it.
- **Coolify** — set `sjung-production`'s branch to `production` and leave its commit at `HEAD`.
- **Merge settings** — allow squash merging only, with the PR title as the commit message and a blank body. Once the `PR title` check has run on a PR, add it to `main`'s required status checks alongside `build`, `Integration Tests` and `e2e`.

## Commits

PRs are squash-merged, so each PR lands on `main` as one commit whose message is the PR title. That title is what release-please reads to pick the next version and write the changelog (see [Releasing](#releasing)), so PR titles follow [Conventional Commits](https://www.conventionalcommits.org/), and the required `PR title` check fails a PR whose title doesn't. Commits on a branch follow the same format, so the branch reads well in review:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type** — one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **scope** — optional, the area touched (e.g. `feat(auth): ...`).
- **description** — imperative, lower case, no trailing period. The `PR title` check enforces the type list and a subject that doesn't start with an upper-case letter, and runs again when the title is edited.
- **Length** — prefer a concise, single-line message (just the `<type>[scope]: <description>` line); only add a body when the change needs context a reviewer can't get from the diff alone (a non-obvious rationale, a breaking change, a ticket reference).
- **Linear ticket** — Linear's GitHub integration auto-completes an issue whenever a PR whose branch name, title or commit references that issue's ID gets merged, regardless of whether that PR actually implements the fix. So the bare `(PER-XXX)` suffix, and that ticket's Linear-suggested branch name, are reserved for the PR that actually finishes the work. Put the suffix in the PR title, since that becomes the commit on `main`:
  - **Closing PR** (implements/finishes the ticket) — use the ticket's Linear-suggested branch name and append its ID in parentheses to the PR title, e.g. `fix(auth): correct token refresh (PER-42)`.
  - **Non-closing PR** (docs, ADRs, research, triage notes that relate to a ticket without finishing it) — do not use that ticket's Linear-suggested branch name or put its ID in the title. Reference the ticket in the PR body as `Refs PER-XXX` instead, so merging it doesn't auto-complete the issue.
- **Breaking changes** — mark with `!` after the type/scope in the PR title (`feat(api)!: ...`). Squash commits on `main` have no body, so the `!` is what release-please sees; a `BREAKING CHANGE:` footer in the PR description doesn't reach `main`, so explain the break in the description for reviewers only.

## Pull requests

PRs can only be squash-merged. The PR title becomes the commit message on `main` (see [Commits](#commits)), so one PR is one change: a behaviour change and an unrelated cleanup only land as separate commits if they go in separate PRs. Separate commits on the branch still help the review.

Write PR descriptions in plain paragraphs and standard Markdown lists — don't insert manual line breaks inside a paragraph (e.g. one sentence or clause per line). GitHub's mobile app wraps each hard-broken line as its own block, so a paragraph written with mid-sentence breaks reads as a staircase of fragments on a phone. Let paragraphs wrap naturally; only start a new line for an actual new paragraph or list item. The same applies to this README and other Markdown docs in the repo — don't hard-wrap prose at a fixed column, let each paragraph/list item be one line in the source.

Don't attribute PRs to Claude and don't link the session that produced them — no "Generated with Claude Code" footer, no `Co-Authored-By: Claude` trailer, and no session/transcript links in the PR title, body, or commit messages.

## Testing Strategy

Unit tests (`npm run test:unit`) run in Node next to the code they test. Integration tests (`npm run test:integration`) call server actions against a disposable Postgres set by `TEST_DATABASE_URL`. Playwright end-to-end tests (`npm run test:e2e`) drive a production build in Chromium against a third disposable Postgres set by `E2E_DATABASE_URL`.

See `docs/testing.md` for which layer a test belongs in, what to assert and the test budget, and `docs/testing-access-rights.md` for the integration harness and the Playwright setup.

