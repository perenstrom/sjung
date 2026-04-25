---
name: ticket-griller
description: Picks a backlog ticket from the Sjung Linear project, grills the user on its implementation until reaching shared understanding, then updates the ticket description with the implementation plan and moves it to Todo. Use when the user wants to refine a ticket, discuss implementation, or says "grill me on a ticket".
---

# Ticket Griller

## Step 1: Discover Linear context

Use the `plugin-linear-linear` MCP server to look up:
- The team: `list_teams`
- The "Backlog" and "Todo" status IDs: `list_issue_statuses` (requires `team`)
- Confirm the project "Sjung" exists: `list_projects`

Run these lookups upfront; reuse the results for the rest of the session.

## Step 2: Pick a ticket

- Call `list_issues` with `project: "Sjung"` and `state: "Backlog"`, ordered by `createdAt`.
- Select the most suitable ticket: highest priority first; oldest first as a tiebreaker.
- Call `get_issue` to fetch full details.
- Present the ticket title and description to the user, then confirm before proceeding.
- If the user wants a different one, show the full list and let them choose by number or title.

## Step 3: Explore the codebase

Before grilling, read all files referenced in the ticket hints and explore related code areas. Use the codebase reference below as a guide. This context is essential for asking informed questions and giving good recommendations.

## Step 4: Grill the user

Interview the user relentlessly about every implementation aspect of the ticket. Walk down each branch of the design decision tree, resolving one decision at a time.

Rules:
- Use the `AskQuestion` tool for every user-facing question in this step (do not ask in plaintext).
- Ask one structured question at a time.
- Each question must include clear options; use `allow_multiple` only when multi-select is genuinely needed.
- Include one option that matches your recommended answer and make the recommendation explicit in the prompt (with a brief rationale).
- If none of the predefined options fit, include an "Other / needs discussion" option.
- If a question can be answered by exploring the codebase, explore instead of asking.
- Actively evaluate ticket size during grilling. If scope exceeds what one agent can implement and verify in a focused pass, guide the user to split it into smaller, independently shippable slices.
- When splitting is needed, resolve and document: (1) which slice stays in the current ticket, (2) clear boundaries for each follow-up slice, and (3) ordering/dependencies.
- Continue until all decisions are resolved and shared understanding is reached.

## Step 5: Compile and update the ticket

After grilling is complete, write an enriched description and update the ticket. Use this template:

```markdown
## Summary

[Refined 1-2 sentence summary]

## Implementation Plan

[Step-by-step plan derived from the grilling session, ordered by execution]

## Key Decisions

- [Decision]: [Chosen approach] — [rationale]

## Acceptance Criteria

- [ ] [Criterion]

## Scope and Slicing

- Ticket size decision: [Single ticket / Split required]
- If split required, this ticket covers: [smallest valuable slice]
- Follow-up slices: [title + boundary + dependency note for each]

## Hints

- Relevant files: [e.g. `app/actions/sheetMusic.ts`]
- Related patterns: [e.g. follows the same pattern as the people page]
```

Call `save_issue` with:
- `id`: the ticket identifier (e.g. `SJ-42`)
- `description`: the enriched markdown above (literal newlines, no escape sequences)
- `state`: "Todo"

If splitting is required, only move this ticket to `Todo` when the description is narrowed to one implementation-sized slice. Keep follow-up slices explicitly listed in `Scope and Slicing`, then create those follow-up tickets using the `linear-ticket-creator` skill.

## Step 6: Stop

After updating the ticket, stop. Do NOT implement anything — no code changes, no file edits, no further tool calls beyond the ticket update.

---

## Codebase Reference

Key files for context and hints:
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
| List backlog issues | `list_issues` |
| Get full issue details | `get_issue` |
| Update issue | `save_issue` |
