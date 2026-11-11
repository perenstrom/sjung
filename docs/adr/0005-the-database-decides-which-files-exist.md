# The database decides which Files exist; storage cleanup is best-effort

Status: accepted (replaces the storage-first policy of PER-157 and PER-294)

A File exists when its row exists. Every change that removes stored content (deleting a File, a Piece or a Group, and replacing a File) writes the database first and then deletes the old objects as best effort, logging any keys it couldn't delete. A failed storage delete never undoes or blocks the database change.

We can't change the database and object storage together atomically, so some failure will always leave them out of step. The choice is which way they drift. An object with no row is invisible: no Member can see or download it, and it costs only bytes. A row with no object is a broken File that Members see and try to download. We pick the drift nobody sees.

## Considered options

- **Storage first, refuse on partial failure** (PER-157 for `deletePiece`, extended to replace in PER-294). Rejected: it didn't prevent drift, it only picked the visible kind. A Piece delete that removed 2 of 3 objects and then refused left a Piece with 2 broken Files, and a replace whose row update failed after the old object was gone left a File pointing at nothing. Applied to Group delete, one flaky object would also block deleting the whole Group.

## Consequences

- Orphaned objects are expected and harmless. Deleting a Piece or a Group removes everything under its storage prefix, which also sweeps up uploads that were never finalized. The orphan audit (PER-210) remains the way to find what's left.
- Replace writes the new object's key to the row before deleting the old object, so a crash in between leaves an orphan, never a broken File.
