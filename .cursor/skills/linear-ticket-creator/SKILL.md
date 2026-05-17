---
name: linear-ticket-creator
description: Creates Linear tickets for the Sjung project from a rough feature/task list. Breaks work into agent-sized tickets, assigns an estimated complexity/size label on every issue, sets state to Backlog, and creates them via the Linear MCP. Use when the user wants to add tickets, create issues, or populate the backlog for the Sjung Linear project.
---

# Linear Ticket Creator

Creates agent-sized Linear tickets for the Sjung project from a rough input list.

## Sjung size labels (Linear)

Sjung issues use team **Per Enström**. Size is expressed with **issue labels** in the **Size** group (the group itself is for organization in Linear; **do not** use `Size` as the only size label on an issue). Use **exactly one** of these leaf labels per ticket, with the **exact names** below in `save_issue` → `labels`:

| Label | Meaning |
|-------|--------|
| `XS` | Trivial: few lines or one obvious file. |
| `S` | Small: few files, follows existing patterns. |
| `M` | Medium: several files or some edge-case judgment. |
| `L` | Large: broad touch surface, schema/auth, or major UI flows. |
| `XL` | Extra large: should usually be split; use only if the user insists on one ticket — call that out when presenting for approval. |

If `list_issue_labels` no longer returns all five names (rename or deletion), stop and agree with the user on replacements before drafting or creating tickets.

## Workflow

### Step 1: Discover Linear context

Read MCP tool descriptors under `mcps/plugin-linear-linear/tools/` before calling any Linear tool.

Use the `plugin-linear-linear` MCP server to look up:
- The team: `list_teams` (expect **Per Enström** for Sjung)
- The "Backlog" status ID for that team: `list_issue_statuses` (requires `team`)
- Confirm the project name "Sjung" exists: `list_projects`
- **Sanity-check size labels:** `list_issue_labels` with `team` set to that team. Confirm `XS`, `S`, `M`, `L`, and `XL` appear (see **Sjung size labels** above). You will attach **exactly one** of these five labels to every created issue.

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

For **each** ticket, choose **one** of `XS` / `S` / `M` / `L` / `XL` per **Sjung size labels**. Record the chosen label in the draft (see template). Do not create issues without one of these five labels unless the user explicitly overrides after you report that the labels are missing from Linear.

**Description template:**

```markdown
## Summary

[1-2 sentences on what this ticket accomplishes and why]

## Estimated size

[One of: `XS`, `S`, `M`, `L`, `XL` — exact Linear issue label name you will set on create]

## Acceptance Criteria

- [ ] [Specific, verifiable criterion]
- [ ] [Specific, verifiable criterion]

## Hints

- Relevant files: [e.g. `app/actions/pieces.ts`, `app/app/[groupSlug]/page.tsx`]
- Related patterns: [e.g. follows `EntityFormDialog` like `CreatePersonDialog`]
```

### Step 5: Present for approval

Show the user all proposed tickets (title + full description, including **Estimated size**) before creating anything in Linear. Wait for explicit confirmation or corrections.

### Step 6: Create tickets in Linear

For each approved ticket, call `save_issue` on the `plugin-linear-linear` MCP server:

```
title: <ticket title>
team: <team name/ID from Step 1>
project: "Sjung"
state: "Backlog"
priority: 0
labels: [<one of: XS, S, M, L, XL>]
description: <markdown description — use literal newlines, no escape sequences>
```

The `labels` array **must** include the ticket’s **Estimated size** label: exactly one of `XS`, `S`, `M`, `L`, or `XL`. You may add other labels only if the user asked for them; do not drop the size label.

Optional: if the team also uses Linear numeric **estimates** (`estimate` on `save_issue`) and the user wants both, set `estimate` consistently with the same sizing intent; otherwise the label alone is enough.

Create tickets one at a time. Report each created issue identifier as you go.

## Codebase reference

Read `.cursor/skills/_shared/codebase-reference.md` when drafting hints or exploring the repo.

## MCP Tools Reference

Server: `plugin-linear-linear`

| Task | Tool |
|------|------|
| List teams | `list_teams` |
| List issue statuses | `list_issue_statuses` (requires `team`) |
| List projects | `list_projects` |
| List issue labels (for size/complexity) | `list_issue_labels` (pass `team`) |
| Create/update issue | `save_issue` |
| List existing issues | `list_issues` |
