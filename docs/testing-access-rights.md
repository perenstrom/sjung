# Testing strategy for integration and access rights

This document defines a practical, phased strategy to test authentication and access rights in Sjung. The goal is to combine fast server-side confidence with a small number of browser-level checks for session and routing behavior.

## Goals

- Verify access control behavior for protected code paths with clear allow/deny expectations.
- Keep day-to-day feedback fast for developers.
- Add browser-level confidence where unit/integration tests cannot fully simulate real navigation and session behavior.
- Keep setup and CI cost proportional to value.

## Current architecture notes

- There is no `middleware.ts` route guard layer today.
- Protection is implemented in server code, mainly through:
  - `requireUser()` in `lib/auth/require-user.ts`
  - Tenant membership checks in `lib/tenant-group.ts`
  - Resource/group guard helpers in `lib/actions/guards.ts`
  - Server actions in `app/actions/*`
  - Tenant layout gating in `app/app/[groupSlug]/layout.tsx`
- `lib/roles.ts` is for music credit roles (for example `Kompositor` and `Arrangor`) and is not RBAC for app authorization.

## Vitest + Prisma vs Playwright

### Vitest + Prisma (integration-style server tests)

Best for:
- Server authz logic in `requireUser`, tenant/group checks, and action guards.
- Fast, deterministic allow/deny matrix testing over many cases.
- Verifying that actions reject unauthorized access before mutation.

Strengths:
- Fast runtime and low flake risk.
- Precise assertions on thrown errors/not-found behavior.
- Easy to cover many combinations in a table-driven style.

Tradeoffs:
- Does not execute full browser navigation.
- Requires a predictable test database lifecycle (migrations + seed + cleanup).
- Requires an explicit test seam for authenticated identity.

### Playwright (browser E2E)

Best for:
- Session cookie/login flow and protected-route smoke behavior.
- Regression checks involving redirects and real app bootstrapping.

Strengths:
- Highest fidelity (real browser + routing + cookies).
- Catches integration gaps between auth, rendering, and navigation.

Tradeoffs:
- Slower and costlier in CI.
- Higher flake risk if overused.
- Harder to maintain broad matrix assertions compared with server-side tests.

### Recommended phased adoption

1. Start with Vitest + Prisma for access-right correctness.
2. Add a minimal Playwright smoke slice for login/protected route verification.
3. Expand Playwright only when user journeys justify browser-level coverage.

## Access-right scope and allow/deny intent

Use this scope as the baseline coverage matrix:

1. Authentication (`requireUser`)
   - Allow: signed-in request with a valid user id.
   - Deny: anonymous/invalid session (expect unauthorized error path).
2. Tenant membership (`requireTenantGroup`, `getWritableGroupIdForSlug`)
   - Allow: user is a member of the target group slug.
   - Deny: non-member or invalid slug (expect not-found or explicit permission error depending on helper).
3. Resource-in-group guards (`lib/actions/guards.ts`)
   - Allow: entity exists and belongs to the caller's resolved group.
   - Deny: entity missing or outside tenant group (expect "not found"/forbidden-style action error).
4. Creator-only operations (`requireCreatorGroupBySlug`, `requireCreatorGroupById`)
   - Allow: user is the group creator.
   - Deny: user is member but not creator.
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
- Keep this identity control in test setup utilities so each test describes identity in one line and avoids HTTP login ceremony.

Why:
- Fast and deterministic.
- Makes guard-path tests focused on authorization logic instead of login mechanics.
- Avoids coupling every integration test to browser/session setup.

## Pilot implementation after this document

First implementation slice: tenant membership authorization.

Pilot target:
- Prove a member can resolve tenant group context.
- Prove a non-member cannot resolve tenant group context.

Suggested first assertions:
- `requireTenantGroup(groupSlug)`:
  - member -> returns `{ userId, groupId, groupSlug }`
  - non-member/invalid -> triggers not-found path
- `getWritableGroupIdForSlug(groupSlug)`:
  - member -> returns `{ userId, groupId }`
  - non-member/invalid -> throws `Ogiltig grupp eller saknad behorighet`

## Tooling and scripts

Add and document a separate integration test command:

- `npm run test:unit` for pure unit tests (fast, always required).
- `npm run test:integration` for DB-backed integration/authz tests.

Environment expectations:

- Use `TEST_DATABASE_URL` for integration tests.
- Local:
  - developer provides a disposable Postgres DB
  - migrations are applied before running tests
  - seed helpers establish deterministic users/groups/resources
- CI (optional at first, recommended once stable):
  - run integration suite only when DB env is configured
  - keep unit suite mandatory on every PR

## Playwright first slice

After the Vitest pilot lands, add one browser smoke scenario:

1. Seed test credentials and tenant data.
2. Sign in through the real login UI.
3. Open one protected tenant URL (for example `app/[groupSlug]`).
4. Assert user is not bounced to login and protected content loads.

This validates session cookies + routing + layout protection in one high-value check without building a large E2E matrix early.

## Follow-up ticket titles (implementation-ready)

1. `PER-XXX: Scaffold Vitest integration harness with TEST_DATABASE_URL and DB lifecycle`
   - Scope: integration test script, setup/teardown hooks, migration/seed strategy, docs updates in README/testing docs.
2. `PER-XXX: Add tenant-membership integration tests for requireTenantGroup and getWritableGroupIdForSlug`
   - Scope: member vs non-member cases, deterministic auth mock/seam, fixture helpers.
3. `PER-XXX: Add guard-level integration tests for resource-in-group helpers`
   - Scope: representative guard helpers in `lib/actions/guards.ts`, cross-tenant deny cases.
4. `PER-XXX: Add creator-only authorization integration tests for group management paths`
   - Scope: creator allow vs member deny for creator-only helpers and related actions.
5. `PER-XXX: Add Playwright auth smoke for protected tenant route`
   - Scope: login flow + one protected page assertion, optional CI job behind environment availability.

## Decision summary

- Primary access-right correctness should be tested with Vitest + Prisma integration tests.
- Browser checks should start small with one Playwright auth smoke.
- Keep unit and integration commands separate to preserve fast feedback.
- Start with tenant-membership pilot, then expand to guard and creator-only coverage.
