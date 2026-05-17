---
name: ticket-griller
description: Picks or loads a Sjung Linear ticket, grills the user on implementation until shared understanding, then updates the ticket with an implementation plan and moves it to Todo. Use when the user wants to refine a ticket, re-grill a Todo ticket, grill a specific issue (e.g. SJ-42), discuss implementation, or says "grill me on a ticket".
---

# Ticket Griller

## Step 1: Discover Linear context

Read MCP tool descriptors under `mcps/plugin-linear-linear/tools/` before calling any Linear tool.

Use the `plugin-linear-linear` MCP server to look up:

- The team: `list_teams` (expect **Per Enström** for Sjung)
- The "Backlog" and "Todo" status IDs: `list_issue_statuses` (requires `team`)
- Confirm the project "Sjung" exists: `list_projects`
- **Size labels:** `list_issue_labels` with `team` set. Confirm `XS`, `S`, `M`, `L`, and `XL` exist (same labels as `linear-ticket-creator`). If any are missing, stop and agree replacements with the user.

Run these lookups upfront; reuse the results for the rest of the session.

## Step 2: Select a ticket (entry modes)

Use the mode that matches what the user asked for:

| Mode | When | What to do |
|------|------|------------|
| **Default** | User wants to grill "a" backlog ticket | `list_issues` with `project: "Sjung"`, `state: "Backlog"`, `orderBy: "createdAt"`. Pick highest priority first; oldest `createdAt` as tiebreaker. |
| **Specific ticket** | User names an id (e.g. `SJ-42`, `PER-42`) | `get_issue` for that id only — skip backlog listing. |
| **Re-grill** | User wants to refine a ticket already in Todo | `get_issue` for that ticket; stay in or return to Todo after update (do not move to Backlog). |
| **Not in Linear yet** | User describes work with no issue | Grill from their description; after Step 5, offer to create a Backlog ticket via `linear-ticket-creator` instead of `save_issue` on a missing id. |

For every selected ticket:

- Call `get_issue` with `includeRelations: true`.
- Present title, description, open `blockedBy` relations, and size label (if any).
- If blockers are not Done, tell the user before grilling; suggest resolving blockers or running **backlog-freshness** if the description may be stale.
- Confirm with the user before proceeding (unless they already named the exact ticket to grill).
- If the user wants a different ticket, show the relevant list and let them choose by number or title.

## Step 3: Explore the codebase

Before grilling:

1. Read `.cursor/skills/_shared/codebase-reference.md`.
2. Read all files referenced in the ticket **Hints** (and in **Key Decisions** / **Implementation Plan** when re-grilling).
3. Explore related areas so recommendations cite real patterns (e.g. `EntityFormDialog`, `lib/actions/guards.ts`).

## Step 4: Grill the user

Interview the user relentlessly about every implementation aspect. Walk down each branch of the design decision tree, resolving one decision at a time.

**Coverage checklist** — ensure these are resolved or explicitly out of scope before finishing:

- Data model / migrations
- Auth and group scoping (`groupSlug`, membership)
- Server actions and Zod validation
- UI placement, navigation, and Swedish copy
- Edge cases and error handling
- Testing / verification (unit tests vs manual; see shared codebase reference)
- Explicit **non-goals** (what this ticket will not do)

**Rules:**

- Use the `AskQuestion` tool for every user-facing question in this step (do not ask in plaintext).
- Ask one structured question at a time.
- Each question must include clear options; use `allow_multiple` only when multi-select is genuinely needed.
- Include one option that matches your recommended answer and state the recommendation in the prompt (with brief rationale). Cite existing code when recommending (e.g. "same as `CreateSetListDialog`").
- If none of the predefined options fit, include an "Other / needs discussion" option.
- If a question can be answered by exploring the codebase, explore instead of asking.
- Actively evaluate ticket size. If scope exceeds what one agent can implement and verify in a focused pass, guide the user to split into smaller, independently shippable slices.
- When splitting, resolve and document: (1) which slice stays in this ticket, (2) boundaries for each follow-up slice, (3) ordering/dependencies.
- Continue until all decisions are resolved and shared understanding is reached.

## Step 5: Compile and update the ticket

After grilling, write an enriched description. Use this template:

```markdown
## Summary

[Refined 1-2 sentence summary]

## Estimated size

[One of: XS, S, M, L, XL — exact Linear label name]

## Implementation Plan

[Step-by-step plan derived from the grilling session, ordered by execution]

## Key Decisions

- [Decision]: [Chosen approach] — [rationale; cite file/pattern when helpful]

## Acceptance Criteria

- [ ] [Specific, verifiable criterion — what to click, what API/action behavior, what exists after migrate, etc.]
- [ ] [Criterion]

## Scope and Slicing

- Ticket size decision: [Single ticket / Split required]
- If split required, this ticket covers: [smallest valuable slice]
- Follow-up slices: [title + boundary + dependency note for each]

## Hints

- Relevant files: [e.g. `app/actions/setlists.ts`, `app/app/[groupSlug]/setlists/[id]/page.tsx`]
- Related patterns: [e.g. follows `EntityFormDialog` like `CreatePersonDialog`; use `requireSetListInGroup` from `lib/actions/guards.ts`]
```

**Description updates:**

- Replace the main body with the template above (Summary through Hints).
- If the ticket already has a `## Freshness Note` from **backlog-freshness**, preserve it at the end of the description (after Hints), unchanged except the date if you are refreshing context.
- Update `title` or `priority` on `save_issue` if grilling showed they are wrong.

Call `save_issue` with:

- `id`: the ticket identifier (e.g. `SJ-42`)
- `description`: enriched markdown (literal newlines, no escape sequences)
- `state`: `"Todo"` (for Backlog tickets; leave as Todo when re-grilling)
- `labels`: exactly one size label matching **Estimated size** (`XS`, `S`, `M`, `L`, or `XL`)

If splitting is required:

- Narrow this ticket to one implementation-sized slice before moving to Todo.
- Keep follow-up slices listed under **Scope and Slicing**.
- Create follow-up Backlog tickets using the **linear-ticket-creator** skill.

If the ticket was **not in Linear**, create it via **linear-ticket-creator** (Backlog + size label) instead of `save_issue` without an id.

## Step 6: Stop

After updating (or creating) the ticket and any split follow-ups:

- Print a short summary for the user (ticket id, new state, size label, split tickets created if any).
- **Do not implement** — no code changes, no file edits.

Allowed after the ticket update: creating split follow-up tickets via **linear-ticket-creator**, and the summary message above. Not allowed: implementation, PRs, or unrelated edits.

---

## Codebase reference

Read `.cursor/skills/_shared/codebase-reference.md` for routes, actions, conventions, and hint examples.

## Sjung size labels (Linear)

Same as **linear-ticket-creator**: exactly one of `XS`, `S`, `M`, `L`, `XL` per ticket on the **Per Enström** team.

| Label | Meaning |
|-------|--------|
| `XS` | Trivial: few lines or one obvious file. |
| `S` | Small: few files, follows existing patterns. |
| `M` | Medium: several files or some edge-case judgment. |
| `L` | Large: broad touch surface, schema/auth, or major UI flows. |
| `XL` | Extra large: should usually be split; do not move to Todo as XL without slicing. |

## MCP Tools Reference

Server: `plugin-linear-linear` — read tool descriptors before calling.

| Task | Tool |
|------|------|
| List teams | `list_teams` |
| List issue statuses | `list_issue_statuses` (requires `team`) |
| List projects | `list_projects` |
| List issue labels (size) | `list_issue_labels` (pass `team`) |
| List backlog issues | `list_issues` |
| Get full issue + relations | `get_issue` (`includeRelations: true`) |
| Update issue | `save_issue` |
