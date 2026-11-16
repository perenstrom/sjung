# Operators are granted by config, not stored on the User

Status: accepted

Announcements (PER-430) need someone who can publish them, which makes Operator the first standing in Sjung that reaches across every Group. A User is an Operator when their email address is listed in the `OPERATORS_EMAIL` environment variable. Nothing in the database records it, and no screen in the app grants or revokes it. This works because Users cannot change their email address in Sjung, so the match stays stable.

## Considered options

- **A flag on User, set by hand.** Rejected for now: it adds a column that only a couple of rows will ever set, and staging and production would need it set separately anyway. Revisit it if Operators ever need to be granted from inside the app, or if Users become able to change their email address.
- **Announcements written as Markdown files in the repo, with no Operator at all.** Rejected: the people running Sjung want to publish and edit from inside the app.

## Consequences

- Operator is not a Claim and has nothing to do with Group access (ADR-0002, ADR-0004). Being an Operator gives no rights in any Group.
- Checking whether someone is an Operator means comparing their normalised email address with the configured list, in the same way `FEEDBACK_EMAIL_TO` is read.
