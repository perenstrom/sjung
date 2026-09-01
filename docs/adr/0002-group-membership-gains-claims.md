# Group membership gains claims: MANAGE_MEMBERS and MANAGE_CONTENT

Status: accepted (supersedes ADR-0001)

ADR-0001 established Creator as a Group's only privileged member, with every permission check comparing against `Group.createdById` — deliberately avoiding a roles table because there was only one privilege tier to express. That's no longer true: some Users need to manage group membership without being the Creator, and some need write access to all of a Group's content without being its Creator. We're introducing two independent **Claims** a member can hold — `MANAGE_MEMBERS` and `MANAGE_CONTENT` — via a `GroupMemberClaim` table keyed by (User, Group, claim), rather than a single `role` column, because the two capabilities are genuinely separable: a member might hold one without the other.

Creator remains structurally special, not modeled as a Claim: it's the only privilege that can never be granted or revoked by anyone, including the holder — matching `Group.createdById` as before. Creator implicitly holds both Claims and is the only member who can rename or delete the Group itself; `MANAGE_MEMBERS` unlocks membership management (invite/remove members, grant/revoke Claims on other members) but not the Group record. Any `MANAGE_MEMBERS` holder can grant or revoke either Claim on any other member, including a Claim they don't hold themselves.

## Considered options

- **Two booleans on `UsersToGroups`** instead of a claims table — simpler, but not extensible if a third Claim shows up later. Rejected: a claims table is barely more ceremony now and avoids a second migration-plus-guard-rewrite when that happens.
- **A single expanded role enum** (e.g. `admin` | `content_admin` | `member`) — rejected because two independent Claims produce four real combinations (neither, either, or both), and an enum would need one value per combination, growing combinatorially if a third Claim is ever added.

## Consequences

- `requireCreatorGroupBySlug` / `requireCreatorGroupById` in `lib/actions/guards.ts` are no longer sufficient for membership-management actions — those need a `MANAGE_MEMBERS` Claim check instead. They remain correct as-is for the two actions still restricted to the Creator specifically: renaming and deleting the Group.
- Opening membership management to non-Creator members means `removeMemberFromGroup`-style actions must gain an explicit "the Creator can never be removed" check — today that's only true as a side effect of the action being Creator-only-callable-and-you-can't-remove-yourself.
- Content-delete guards need a new default-ownership check (`createdById` match) for members without `MANAGE_CONTENT`. That change is deliberately not part of this ADR — see the content-ownership Wayfinder ticket linked from the PER-111 map for its own decision.
