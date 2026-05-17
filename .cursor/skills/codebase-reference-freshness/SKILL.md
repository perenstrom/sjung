---
name: codebase-reference-freshness
description: Audits the Sjung repo against `.cursor/skills/_shared/codebase-reference.md`, updates stale paths and conventions, and reports what changed. Use when the user wants to refresh the shared codebase reference, keep agent skills accurate, or says "codebase reference freshness" or "update the codebase reference".
---

# Codebase Reference Freshness

Keeps `.cursor/skills/_shared/codebase-reference.md` aligned with the real repository. Other skills (`ticket-griller`, `ticket-implementer`, `linear-ticket-creator`, `backlog-freshness`) depend on this file — treat accuracy as high priority.

**Scope:** Update only `codebase-reference.md` unless the user explicitly asks to sync example paths in other skills.

## Step 1: Load the current reference

Read `.cursor/skills/_shared/codebase-reference.md` in full. Note each section and bullet — these are claims to verify, not facts to trust.

## Step 2: Audit architecture

Verify against the repo:

| Claim | Where to check |
|-------|----------------|
| Stack (Next.js, Prisma, NextAuth, R2, Vitest) | `package.json` dependencies and scripts |
| Multi-tenant groups | `prisma/schema.prisma` (`Group`, `UsersToGroups`); `lib/tenant-group.ts` |
| Auth / route protection | `proxy.ts` matcher and redirect logic; `app/api/auth/[...nextauth]/route.ts` |
| Swedish UI / errors | Sample server actions and dialogs (throw/display patterns) |

Update the **Architecture** section if any stack or cross-cutting behavior changed.

## Step 3: Audit routes

Discover all route entry points:

```bash
# Pages (adjust glob if app structure changes)
find app -name 'page.tsx' | sort
```

Also read `app/app/layout.tsx`, `app/app/[groupSlug]/layout.tsx`, and `components/AppSidebar.tsx` for nav links and guards.

Update the **Routes** table so that:

- Every user-facing `page.tsx` under `app/` is listed or intentionally omitted with reason (e.g. internal-only).
- Paths match the filesystem (including `[groupSlug]`, `me`, `auth`, `api`).
- Notes mention layout guards (`requireTenantGroup`) where applicable.
- Sidebar registration still points at `components/AppSidebar.tsx`.

## Step 4: Audit server actions

List `app/actions/*.ts` and skim each file's exports and domain.

Update **Server actions**:

- The file → domain table matches reality.
- **Conventions** still match how actions are written (Zod paths, guards, revalidation helpers, `getWritableGroupIdForSlug`, Swedish errors).
- **Query modules** — list any new `lib/*/queries.ts` (or similar) used for reads.

Read `lib/actions/guards.ts` and ensure exported `require*` helpers mentioned in the doc still exist; add new guards, remove deleted ones.

## Step 5: Audit lib utilities

List `lib/**/*.ts` (exclude `*.test.ts` and generated output). Compare to the **Lib utilities** table.

- Add rows for new modules agents commonly need in tickets.
- Remove rows for deleted or renamed paths.
- Keep the table focused — prefer modules referenced by actions, pages, or multiple features; skip one-off test helpers unless widely used.

Check `lib/revalidate/group-routes.ts` for new revalidation helpers and mention the pattern if helpers were added.

Check `lib/schemas/` for new domain schema files.

## Step 6: Audit data model

Read `prisma/schema.prisma`:

- Update the core entities list to match current models.
- Confirm generated client path (`app/generated/prisma`) if output changed in `generator client`.
- Keep migration instructions accurate (`npx prisma migrate dev --name …`).

## Step 7: Audit UI components

Scan `components/`:

- Confirm `EntityFormDialog` is still the preferred CRUD pattern; note major alternatives if a new pattern dominates.
- List representative feature dialogs in the **Dialogs** bullet (create/edit/delete naming conventions).
- Verify breadcrumb and credit references (`lib/roles.ts`, breadcrumb components).
- Update **When adding interactive UI** rules if form/dialog patterns changed.

Do not enumerate every component file — stay at pattern level.

## Step 8: Audit testing and CI

Verify:

- Test runner and config (`vitest.config.*`, `package.json` test script).
- CI workflow path(s) under `.github/workflows/`.
- Whether testing guidance (unit vs manual) still matches project practice.

Update the **Testing** section accordingly.

## Step 9: Audit hints and examples

Every path in **Hints for tickets** examples must exist. Replace examples with current real files if any path is wrong.

Ensure hint guidance still matches how sibling skills write tickets (concrete paths + named patterns).

## Step 10: Apply updates

Edit `.cursor/skills/_shared/codebase-reference.md`:

- Preserve the same top-level sections and overall tone (concise reference, not a tutorial).
- Fix stale paths, tables, and lists; add missing items; remove obsolete ones.
- Do not add long narrative or ticket-specific content.
- Do not add a "last updated" footer unless the user asked for it.

**Do not** edit other skill files in this step.

## Step 11: Report

Print a summary for the user:

```
Codebase reference — REFRESHED | NO CHANGES NEEDED

Architecture: [unchanged | updated — one line why]
Routes: [+N added, -N removed, or unchanged]
Server actions: […]
Lib utilities: […]
Data model: […]
UI / testing: […]
Hints examples: […]
```

If updated, list the most important corrections (wrong paths removed, new routes/actions added). If nothing changed, say so explicitly.

## Step 12: Stop

Do not implement product features, Linear tickets, or unrelated refactors. This skill only maintains the shared reference (unless the user expands scope).

---

## Reference file

Target: `.cursor/skills/_shared/codebase-reference.md`

## Consumers (do not edit unless asked)

These skills read the shared reference:

- `ticket-griller`
- `ticket-implementer`
- `linear-ticket-creator`
- `backlog-freshness`

If section headings or structure change materially, mention in the report that those skills may need a quick review — but only edit them when the user requests it.
