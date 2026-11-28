# Content edit rights split into fine-grained Claims

Status: accepted (partly supersedes ADR-0004)

ADR-0004 made `MANAGE_CONTENT` the only way to change a Group's content. Groups need narrower rights than that: a conductor or section leader who sets a concert's running order shouldn't also be able to change Pieces, Files or People. So content edit rights are being split into fine-grained Claims, each covering one kind of change, and `MANAGE_CONTENT` will be retired once they cover everything. The first is `REORDER_SET_LISTS` (PER-488): change the order of the Set list steps in any of the Group's Set lists, without adding, removing or editing them.

Each new Claim stands on its own. It does not imply or require `MANAGE_CONTENT`, and `MANAGE_CONTENT` is not modelled as including it, because `MANAGE_CONTENT` is on its way out. Until then, an action is allowed if the Member is the Creator, holds `MANAGE_CONTENT`, or holds the fine-grained Claim for that action. ADR-0004's other rule still holds: rights depend only on the Member, never on who created the content.

## Considered options

- **Tie new Claims to `MANAGE_CONTENT`** (for example, show them as implied in the Behörigheter dialog). Rejected: it would build on a Claim that is going away.
- **Grant reordering per Set list** instead of Group-wide. Rejected: nothing else in the model has per-row permissions, and a Group-wide Claim reuses the Claims table ADR-0002 chose for exactly this.
- **Add a Running-order note at a chosen position** so that `MANAGE_RUNNING_ORDER_NOTES` never needs to move anything (PER-189). Rejected: it needs new insert controls between every pair of steps, and a note added in the wrong place would still be stuck. Instead `MANAGE_RUNNING_ORDER_NOTES` may also move Running-order notes; see Consequences.

## Consequences

- Edit mode is no longer one switch tied to `manageContent`. It is offered when the Member has any capability that matters on the page, and each control inside it checks its own capability.
- Two Claims can allow a reorder. `REORDER_SET_LISTS` allows any new order of the steps. `MANAGE_RUNNING_ORDER_NOTES` allows a new order only if the Set list pieces keep their order among themselves, so only Running-order notes have moved (PER-189). Each Claim covers one kind of step, so neither overlaps the other.
