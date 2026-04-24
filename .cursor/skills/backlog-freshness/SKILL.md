---
name: backlog-freshness
description: Audits Backlog and Todo tickets in the Sjung Linear project against recently completed tickets. Identifies met dependencies and stale assumptions, then updates affected tickets autonomously. Use when the user wants to refresh the backlog, check for stale tickets, or says "freshness check".
---

# Backlog Freshness Checker

Audits every Backlog and Todo ticket in the Sjung project and updates any that have been made stale by recently completed work.

## Step 1: Discover Linear context

Use the `plugin-linear-linear` MCP server to look up:
- The team: `list_teams`
- The Backlog, Todo, and Done status IDs: `list_issue_statuses` (requires `team`)
- Confirm the project "Sjung" exists: `list_projects`

Run these lookups upfront; reuse the results for the rest of the session.

## Step 2: Fetch tickets

Fetch three sets of issues (all with `project: "Sjung"`):

1. `list_issues` with `state: "Backlog"` — pending tickets
2. `list_issues` with `state: "Todo"` — pending tickets
3. `list_issues` with `state: "Done"` — completed tickets

For each pending ticket (backlog + todo), call `get_issue` with `includeRelations: true` to retrieve its full description and blocking/blocked-by relations.

## Step 3: Match pending tickets to relevant done tickets

For each pending ticket, filter the done list to tickets whose `completedAt` (or `updatedAt` if `completedAt` is unavailable) is **after** the pending ticket's own `updatedAt`. These are tickets completed since the pending ticket was last touched, and therefore represent information it has never accounted for.

If a pending ticket has no such done tickets, skip it — no update needed.

## Step 4: Analyze impact

For each pending ticket that has relevant done tickets, run three checks:

**Dependency check**
Look at the pending ticket's `blockedBy` relations. If any blocker appears in the relevant done set, that dependency has been met and should be cleared.

**Assumption check**
Read both descriptions side by side. Determine whether the done ticket's implementation overlaps with, changes, or invalidates anything the pending ticket assumes. Examples:
- A pending ticket plans to add a data model that the done ticket already added
- A pending ticket references a UI pattern that was changed by the done ticket
- A pending ticket duplicates acceptance criteria already satisfied

**Scope overlap check**
Compare acceptance criteria for partial or full duplication. Note anything that has already been delivered.

Produce a structured internal finding per pending ticket:
- Which done tickets are relevant and why
- Met `blockedBy` relations to remove
- Description amendments needed (with proposed text)
- Whether the ticket might be fully obsolete

## Step 5: Apply updates

For each pending ticket with findings, call `save_issue` with:

- `id`: the ticket identifier (e.g. `SJ-42`)
- `description`: the existing description with a `## Freshness Note` section appended (see template below) — use literal newlines, no escape sequences
- `removeBlockedBy`: array of any met blocker IDs identified in Step 4

If a ticket appears fully obsolete, append a note to that effect but do **not** change its state — leave cancellation to the user.

**Freshness Note template:**

```markdown
## Freshness Note

*Updated by backlog freshness checker on [date].*

### Relevant completed tickets
- [SJ-XX] [Title] — [one sentence: why it is relevant]

### Changes to this ticket
- [Met dependency / Stale assumption / Overlapping scope]: [description of the impact]
```

Never remove or overwrite existing description content — only append the freshness note.

## Step 6: Report

After all updates are applied, print a summary grouped by ticket:

```
SJ-12 Add People credits UI — UPDATED
  Met dependency: SJ-8 (Add People model) is now done
  Stale assumption: People table schema has changed — see Freshness Note

SJ-15 Export to MusicXML — no changes needed

SJ-17 Roles refactor — UPDATED
  Stale assumption: lib/roles.ts was restructured in SJ-11 — see Freshness Note
```

---

## MCP Tools Reference

Server: `plugin-linear-linear`

| Task | Tool |
|------|------|
| List teams | `list_teams` |
| List issue statuses | `list_issue_statuses` (requires `team`) |
| List projects | `list_projects` |
| List issues by state | `list_issues` |
| Get full issue + relations | `get_issue` (set `includeRelations: true`) |
| Update issue | `save_issue` |

Key `save_issue` fields for this skill:
- `id` — ticket identifier to update
- `description` — full updated description (literal newlines)
- `removeBlockedBy` — array of blocker IDs to remove

## Codebase Reference

Key files for assumption checking:
- `app/actions/sheetMusic.ts`, `app/actions/people.ts` — server actions
- `app/page.tsx` — sheet music listing (Noter)
- `app/people/page.tsx` — people listing (Personer)
- `components/` — UI components including dialogs and `ui/` shadcn primitives
- `lib/roles.ts` — credit roles (Kompositör, Arrangör, Textförfattare)
- `lib/prisma.ts`, `lib/context.ts` — DB client and bootstrap IDs
- `prisma/schema.prisma` — data model (users, groups, sheetMusic, files, people, credits)
