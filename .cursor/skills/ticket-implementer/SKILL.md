---
name: ticket-implementer
description: Picks a Todo ticket from the Sjung Linear project and implements it end-to-end: creates a git branch, writes the code following project conventions, verifies with lints and build, commits, pushes, opens a pull request to main, and moves the ticket to In Review. Use when the user wants to implement a ticket, work on a ticket, or says "pick a ticket and implement it".
---

# Ticket Implementer

## Step 1: Discover Linear context

Read MCP tool descriptors under `mcps/plugin-linear-linear/tools/` before calling any Linear tool.

Use the `plugin-linear-linear` MCP server to look up:
- The team: `list_teams` (expect **Per Enström** for Sjung)
- Status IDs for "Todo", "In Progress", and "In Review": `list_issue_statuses` (requires `team`)
- Confirm project "Sjung" exists: `list_projects`

Run these lookups upfront; reuse the results for the rest of the session.

## Step 2: Pick a ticket

- Call `list_issues` with `project: "Sjung"`, `state: "Todo"`, `orderBy: "createdAt"`.
- Select: highest priority first; oldest as tiebreaker.
- Call `get_issue` to fetch full details (implementation plan, decisions, acceptance criteria, hints).
- Present the ticket title and description to the user, then confirm before proceeding.
- If the user wants a different one, show the full list and let them choose by number or title.

## Step 3: Move to In Progress

- Call `save_issue` with `id` and `state: "In Progress"`.

## Step 4: Create a git branch

- Derive a branch name: lowercase ticket identifier + slugified title, e.g. `sj-42/add-sheet-music-filtering`.
- Ensure local `main` is up to date first:
  - `git checkout main`
  - `git pull origin main`
- Create the feature branch from the updated `main`: `git checkout -b <branch>`.

## Step 5: Explore the codebase

Before writing any code:

1. Read `.cursor/skills/_shared/codebase-reference.md`.
2. Read all files referenced in the ticket hints, implementation plan, and key decisions.

## Step 6: Implement the ticket

Work through the ticket's implementation plan and key decisions. Check off each acceptance criterion as you go.

Follow project conventions in `.cursor/skills/_shared/codebase-reference.md` (server actions, group scoping, Zod validation, guards, revalidation helpers, UI patterns, schema migrations).

## Step 7: Verify

1. Run `ReadLints` on all edited files; fix any errors introduced by your changes.
2. Run `nvm use 22 && npx next build` and confirm it succeeds.
3. If the build fails, fix the issues and re-verify.

## Step 8: Commit in small increments

- Do **not** bundle the whole implementation into one large commit unless the change is truly tiny.
- Split work into small, logical commits (for example: schema change, server action update, UI update, tests/docs), each leaving the branch in a coherent state.
- Keep each commit message clear and specific, and reference the ticket in every commit, e.g.:
  - `SJ-42: Add composer filter to sheet music query`
  - `SJ-42: Add composer filter controls to Noter page`
- Before pushing, ensure commits read as a clean story and are easy to review.

## Step 9: Push, open PR to main, move ticket to In Review

1. Push the branch: `git push -u origin <branch>` (use the branch from Step 4).
2. Resolve `owner` and `repo` for GitHub (e.g. parse `github.com/<owner>/<repo>` from `git remote get-url origin`).
3. Use the `user-github` MCP server: read the tool descriptor for `create_pull_request`, then call it with:
   - `base`: `main`
   - `head`: the pushed branch name (same repo; if the workflow uses a fork, use `forkOwner:branch` for `head` per GitHub’s API)
   - `title`: concise, aligned with the ticket (include the ticket id when helpful, e.g. `SJ-42: Add composer filtering`)
   - `body`: short summary of what changed and why; link the Linear issue URL when you have the issue id or identifier
4. Share the PR URL with the user.
5. Call `save_issue` with `id` and `state: "In Review"`.

---

## Codebase reference

See `.cursor/skills/_shared/codebase-reference.md`.

## MCP Tools Reference

Server: `plugin-linear-linear`

| Task | Tool |
|------|------|
| List teams | `list_teams` |
| List issue statuses | `list_issue_statuses` (requires `team`) |
| List projects | `list_projects` |
| List Todo issues | `list_issues` |
| Get full issue details | `get_issue` |
| Update issue state | `save_issue` |

Server: `user-github`

| Task | Tool |
|------|------|
| Open PR into `main` | `create_pull_request` (`owner`, `repo`, `title`, `head`, `base`; optional `body`, `draft`) — always read the tool descriptor under the MCP folder before calling |
