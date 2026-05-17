# Sjung Codebase Reference

Shared context for Linear skills, ticket grilling, and implementation. Read this file when exploring the codebase or writing ticket hints.

## Architecture

- **Stack:** Next.js App Router, React Server Components, Prisma (PostgreSQL), NextAuth (credentials), Cloudflare R2 for file storage, Vitest for unit tests.
- **Multi-tenant groups:** Most app data is scoped to a `Group`. Users belong to groups via `UsersToGroups`. Routes under `/app/[groupSlug]/…` resolve the tenant with `requireTenantGroup` / `getWritableGroupIdForSlug`.
- **Auth:** `proxy.ts` protects `/app/*`; unauthenticated users redirect to `/auth/login`. Server code uses `requireUser()` from `lib/auth/require-user.ts`.
- **Swedish UI:** User-facing strings are in Swedish; validation errors thrown from server actions are Swedish.

## Routes

| Area | Path | Notes |
|------|------|--------|
| Landing / redirect | `app/page.tsx` | Public entry |
| Auth | `app/auth/login/page.tsx`, `app/auth/signup/page.tsx` | Login/signup |
| App shell | `app/app/page.tsx` | Post-login hub |
| User groups | `app/app/me/page.tsx`, `app/app/me/groups/page.tsx` | Manage memberships |
| Group home (pieces) | `app/app/[groupSlug]/page.tsx` | Piece listing |
| Piece detail | `app/app/[groupSlug]/pieces/[id]/page.tsx` | Metadata, files, links, notes |
| People | `app/app/[groupSlug]/people/page.tsx` | Personer |
| Members | `app/app/[groupSlug]/members/page.tsx` | Group members |
| Set lists | `app/app/[groupSlug]/setlists/page.tsx` | Setlist listing |
| Set list detail | `app/app/[groupSlug]/setlists/[id]/page.tsx` | Pieces in set list |
| Group layout guard | `app/app/[groupSlug]/layout.tsx` | Calls `requireTenantGroup` |

Register new sidebar nav entries in `components/AppSidebar.tsx`.

## Server actions

Files in `app/actions/`:

| File | Domain |
|------|--------|
| `pieces.ts` | Pieces, credits, links, piece notes |
| `people.ts` | People |
| `setlists.ts` | Set lists and set-list pieces |
| `groups.ts` | Groups and membership |
| `files.ts` | File upload/delete (R2) |

**Conventions:**

- `"use server"` at top of file.
- Prisma via `@/lib/prisma` (singleton).
- Resolve `groupId` with `getWritableGroupIdForSlug(groupSlug)` from `lib/tenant-group.ts` — never hard-code group IDs.
- Validate input with Zod parsers in `lib/schemas/*` (e.g. `lib/schemas/pieces.ts`, `people.ts`, `groups.ts`, `files.ts`, `auth.ts`).
- Use entity guards from `lib/actions/guards.ts` (`requirePieceInGroup`, `requireSetListInGroup`, etc.) before reads/writes.
- Shared FormData parsing helpers: `lib/actions/input.ts`.
- After mutations, revalidate via helpers in `lib/revalidate/group-routes.ts` (not raw paths scattered in actions).
- Throw Swedish `Error` messages on invalid input or forbidden access.

**Query modules:** Heavy read logic often lives in `lib/pieces/queries.ts` (and similar), called from actions or pages.

## Data model

`prisma/schema.prisma` — generated client at `app/generated/prisma`.

Core entities: `User`, `Group`, `Piece`, `Person`, `File`, `Link`, `SetList`, `SetListPiece`, `PieceNote`, `SetListPieceNote`, credits on pieces, `UsersToGroups`.

Schema changes: edit `schema.prisma`, run `npx prisma migrate dev --name <descriptive-name>`.

## UI components

- **Primitives:** `components/ui/` — shadcn/Radix (Button, Dialog, Table, Sidebar, etc.).
- **Dialogs:** Feature dialogs (`CreatePieceDialog`, `CreatePersonDialog`, `CreateSetListDialog`, …) often use `EntityFormDialog` (`components/EntityFormDialog.tsx`) for consistent submit/error/close behavior.
- **Breadcrumbs:** `components/AppBreadcrumb.tsx`, `BreadcrumbRegistrar.tsx`, `lib/breadcrumbs.ts`.
- **Credits:** `lib/roles.ts` — `ROLES`, `Role` (Kompositör, Arrangör, Textförfattare).

When adding interactive UI:

- `"use client"` where needed.
- Prefer `EntityFormDialog` for simple CRUD forms calling server actions.
- Forms use `action={async (formData) => …}` forwarding to server actions.
- Use `getThrownMessage` (`lib/getThrownMessage.ts`) for Swedish error display.

## Lib utilities (common in tickets)

| Path | Purpose |
|------|---------|
| `lib/tenant-group.ts` | `requireTenantGroup`, `getWritableGroupIdForSlug` |
| `lib/auth/require-user.ts` | `requireUser()` for authenticated server code |
| `lib/actions/guards.ts` | Entity-in-group authorization guards |
| `lib/actions/input.ts` | Shared FormData parsing |
| `lib/schemas/*.ts` | Zod validation per domain |
| `lib/pieces/queries.ts`, `credits.ts`, `types.ts` | Piece reads and credit logic |
| `lib/setlists/types.ts` | Set list types |
| `lib/r2.ts` | R2 object storage |
| `lib/group-slug.ts` | Slug helpers |
| `lib/active-group-cookie.ts` | Active group selection |
| `lib/revalidate/group-routes.ts` | `revalidatePath` helpers per route |

## Testing

- Vitest: `*.test.ts` next to sources (e.g. `lib/schemas/pieces.test.ts`).
- CI: `.github/workflows/pr-unit-tests.yml` runs on PRs.
- Prefer unit tests for schemas, guards, and pure lib functions; manual verification for full UI flows unless the ticket specifies otherwise.

## Hints for tickets

When writing **Hints**, cite concrete paths and existing patterns, e.g.:

- Relevant files: `app/actions/setlists.ts`, `app/app/[groupSlug]/setlists/[id]/page.tsx`
- Related patterns: same dialog pattern as `CreatePersonDialog`; same guard pattern as `requirePieceInGroup` in `lib/actions/guards.ts`
