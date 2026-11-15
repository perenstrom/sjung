---
name: archive-tickets
description: Harvest closed Sjung tickets into the repo (ticket ledger, ADRs, CONTEXT.md) so they can be archived in Linear.
disable-model-invocation: true
---

# Archive tickets

Linear's free plan caps how many issues the workspace holds, and archived issues don't count. This skill **harvests** closed tickets in the `Sjung` project before they're archived: every ticket gets a one-line **gist** in the **ledger** (`docs/ticket-ledger.md`), and any lasting finding moves into the repo's domain docs. After that, the Linear ticket is disposable.

Arguments: optional ticket IDs, or a count (`archive-tickets 20` harvests the 20 oldest). With none, harvest every unledgered ticket.

## 1. Find the batch

List the project's closed tickets: `list_issues` with `project: "Sjung"`, once for `state: "completed"` and once for `state: "canceled"`, both with `includeArchived: true` (an auto-archived ticket is still unharvested) and fields `id, title, status, completedAt, canceledAt, archivedAt, labels, parentId`. Page until `hasNextPage` is false.

Drop every ID already in the ledger. Hold back a parent ticket (e.g. a `wayfinder:map`) while any of its sub-issues is still open; harvest it with its children once they're all closed. Sort the rest oldest-closed first.

Done when: you have the batch list, and every closed ticket in the project is either in it, already in the ledger, or held back with a reason.

## 2. Harvest each ticket

For each ticket, read everything that might hold a finding: `get_issue` with fields `title, description, status, completedAt, canceledAt, attachments, relations`, plus `list_comments` (resolution comments on `wayfinder:*` tickets carry the decisions). Read a map together with its children.

Sort each finding into one sink:

- **A term** the ticket named, sharpened or renamed → `CONTEXT.md`.
- **A decision** that is hard to reverse, surprising without its reason, or the outcome of a real trade-off → an ADR in `docs/adr/`.
- **Everything else** (what was built, how a bug was fixed, UI tweaks) → the gist only. The code and the linked PR already hold the detail.

Use the `domain-modeling` skill for the CONTEXT.md and ADR formats and their bar. Before writing either, grep `CONTEXT.md` and `docs/adr/` for the concept: shipped work often recorded it already, and the job is then just to cite it. Check the decision against the current code too: a later ticket may have overturned it, in which case record the later state, or nothing.

A canceled ticket's finding is _why_ it was dropped; that reason is often worth an ADR's "Considered options".

Done when: every finding in every ticket in the batch has a sink, and you could name it.

## 3. Write the ledger

One line per ticket in `docs/ticket-ledger.md`, kept in ID order (numeric):

```
- **PER-415** Sheet music links sometimes don't open from lists · Done 2026-11-15 · Files open through a plain link; iOS Safari blocks `window.open` after an await · [#165](https://github.com/perenstrom/sjung/pull/165)
```

Fields: ID, title as in Linear, final state and date, the gist, the merged PR(s) from the ticket's attachments, and `→ ADR-000N` / `→ CONTEXT: Term` when step 2 sent a finding there. Add `(under PER-340)` for a sub-issue. The gist answers what someone landing on this ID in a commit or comment wants to know: what changed, or why it was dropped. One clause, in the glossary's terms.

Done when: every ticket in the batch has exactly one line, and the ledger has no duplicate IDs.

## 4. Commit

On a plain branch whose name has no ticket ID (e.g. `docs/ticket-ledger-2026-11`), commit the ledger and any ADR / CONTEXT.md changes as `docs(tickets): harvest N closed tickets`. Keep ticket IDs out of the commit message and PR title and body: Linear's GitHub integration would link the PR to each ID it finds and may move canceled tickets to Done (see `docs/agents/issue-tracker.md`). Open the PR if the user asks.

## 5. Hand over the archiving

The Linear MCP tools can't archive. Add the `ledgered` label to every harvested ticket (`save_issue` with `addLabels`; create the label with `create_issue_label` on the first run), then tell the user:

> In Linear, filter the Sjung project by label `ledgered`, select all, and archive. Archive, don't delete: an archived ticket keeps its ID and URL, a deleted one is purged after 30 days.

Report the batch size, the ADRs and CONTEXT.md entries written, and anything held back.
