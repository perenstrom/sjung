---
name: linear-ticket-creator
description: Creates Linear tickets for the Sjung project from a rough feature/task list. Breaks work into agent-sized tickets, sets state to Backlog, and creates them via the Linear MCP. Use when the user wants to add tickets, create issues, or populate the backlog for the Sjung Linear project.
---

# Linear Ticket Creator

Creates agent-sized Linear tickets for the Sjung project from a rough input list.

## Workflow

### Step 1: Discover Linear context

Use the `plugin-linear-linear` MCP server to look up:
- The team: `list_teams`
- The "Backlog" status ID for that team: `list_issue_statuses` (requires `team`)
- Confirm the project name "Sjung" exists: `list_projects`

Run these lookups upfront; reuse the results for all tickets in the session.

### Step 2: Analyze the input list

The user provides a rough, potentially incomplete list of features or tasks.

- Identify scope ambiguities or uncertainties — ask clarifying questions using `AskQuestion` when available, otherwise ask conversationally
- **Only ask about scope or uncertainty; never ask about implementation details**
- The list is not necessarily complete or well-divided — use judgment to reorganize

### Step 3: Break down into agent-sized tickets

Split and reorganize items so each ticket is:
- Small enough for a coding agent to implement in one session
- Touching a limited number of files with a clear "done" state
- Independent enough to be worked on in isolation where possible

### Step 4: Draft tickets

Write each ticket in the template below. Tone: written for a coding agent, readable by a human. These are backlog stubs — lightweight, not full specs.

**Description template:**

```markdown
## Summary

[1-2 sentences on what this ticket accomplishes and why]

## Acceptance Criteria

- [ ] [Specific, verifiable criterion]
- [ ] [Specific, verifiable criterion]

## Hints

- Relevant files: [e.g. `app/actions/sheetMusic.ts`, `components/SheetMusicTable.tsx`]
- Related patterns: [e.g. follows the same pattern as the people page]
```

### Step 5: Present for approval

Show the user all proposed tickets (title + full description) before creating anything in Linear. Wait for explicit confirmation or corrections.

### Step 6: Create tickets in Linear

For each approved ticket, call `save_issue` on the `plugin-linear-linear` MCP server:

```
title: <ticket title>
team: <team name/ID from Step 1>
project: "Sjung"
state: "Backlog"
priority: 0
description: <markdown description — use literal newlines, no escape sequences>
```

Create tickets one at a time. Report each created issue identifier as you go.

## Sjung Codebase Reference

Key files for hints:
- `app/actions/sheetMusic.ts`, `app/actions/people.ts` — server actions
- `app/page.tsx` — sheet music listing (Noter)
- `app/people/page.tsx` — people listing (Personer)
- `components/` — UI components including dialogs and `ui/` shadcn primitives
- `lib/roles.ts` — credit roles (Kompositör, Arrangör, Textförfattare)
- `lib/prisma.ts`, `lib/context.ts` — DB client and bootstrap IDs
- `prisma/schema.prisma` — data model (users, groups, sheetMusic, files, people, credits)

## MCP Tools Reference

Server: `plugin-linear-linear`

| Task | Tool |
|------|------|
| List teams | `list_teams` |
| List issue statuses | `list_issue_statuses` (requires `team`) |
| List projects | `list_projects` |
| Create/update issue | `save_issue` |
| List existing issues | `list_issues` |
