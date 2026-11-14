# Deleted Users leave content unattributed

Status: accepted

When a User deletes their account, the content they created or last edited stays with its Group, and its `createdById` / `updatedById` are cleared, so those audit columns become nullable everywhere. A Group's `createdById` is the exception: it defines the Creator (ADR-0002) and stays required, so Account deletion deletes the Groups where the User is Creator and the only Member, and is blocked while they are Creator of a Group that has other Members.

## Considered options

- **A shared placeholder "deleted user" row** that all such references point to, keeping the columns non-null. Rejected: it stores a fake User that every query about Users would have to exclude, and ADR-0004 already makes who created content irrelevant to what anyone can do with it.
- **Deleting every Group the User created**, even with other Members in it. Rejected: one person leaving would wipe a whole ensemble's library without warning.
- **Transferring Creator first.** Not possible today, since Creator can never be granted or revoked. A later way to hand over Creator could replace the block.

## Consequences

- Anywhere that shows who created or edited content (today only Piece notes) needs a fallback for a missing User: _Borttagen användare_.
- `Invitation.invitedById` already worked this way (`SetNull`); this decision brings the rest of the audit columns in line.
