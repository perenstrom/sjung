# Content edit rights come only from MANAGE_CONTENT

Status: accepted (replaces the content-ownership consequence of ADR-0002)

A Member may create, edit or delete a Group's content (Pieces with their Files, Links, Credits and Piece notes; Set lists with their steps and Performance notes; People) only if they are the Creator or hold the `MANAGE_CONTENT` Claim. A Member without it can only read content. Who created a piece of content never matters: there is no ownership by creator, and a Member cannot edit even what they made themselves. ADR-0002 expected a default-ownership check (`createdById` match) for Members without `MANAGE_CONTENT`; we're not building one.

## Considered options

- **Ownership by creator, with `MANAGE_CONTENT` as a bypass** (the ADR-0002 expectation). Rejected: a Group's repertoire is shared material looked after by a few people, not a set of personal contributions. Ownership would also leave content locked to Members who have left or lost interest.

## Consequences

- The rule depends only on the Member, never on the content row, so it is checked once per action before any content is looked up, not per row.
- There is no migration: when the rule is switched on, existing Members without the Claim become read-only. Members holding `MANAGE_MEMBERS` grant `MANAGE_CONTENT` where it's needed.
- The audit columns `createdById` / `updatedById` on content stay audit-only.
