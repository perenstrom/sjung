# Members join only through Invitations

Status: accepted

Until now a Member holding `MANAGE_MEMBERS` added someone by typing their email: if a User had that address they became a Member instantly, and if not the action failed with "Ingen användare med den e-posten hittades". That gave the added User no say, told the inviter whether an address had an account, and offered no way in for people without one. We're replacing it with a single path: adding someone by email always creates an **Invitation**, bound to that address, which the person must accept from the emailed link — whether or not they already have an account.

Because an Invitation is bound to its address and its link only reaches that inbox, accepting it proves control of the address the same way the signup confirm link does. Accepting therefore also marks the User Verified, and signing up from an Invitation creates the User as Verified with no separate verification email.

## Considered options

- **Hybrid: keep the instant add for existing Users, invite only unknown addresses.** Rejected: it keeps adding people without consent, the two different outcomes still reveal which addresses have accounts, and it means building and testing two flows instead of one.
- **Unbound Invitations (whoever holds the link can accept).** Rejected: a forwarded or leaked link would let a stranger join the Group, and it would make the "accepting verifies the address" reasoning false.
- **Keep acceptance separate from verification.** Rejected: an invited newcomer would get two emails back to back (invitation, then verify) that prove the same thing.

## Consequences

- `addMemberToGroup`'s instant insert goes away; the members page's add action creates (or re-issues) an Invitation and sends its email instead.
- The accept page and action live outside `/app` and must accept Unverified users, so they can't use the plain `requireUser()` that rejects them.
- Like the signup confirm link, the emailed accept link must not change state on GET — mail scanners open links before the human does. Acceptance happens on a button POST.
- An address already held by an Unverified user who isn't the invitee can only be reclaimed through password reset, not through the Invitation.
