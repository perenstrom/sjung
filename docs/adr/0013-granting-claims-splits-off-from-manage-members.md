# Granting Claims splits off from MANAGE_MEMBERS

Status: accepted (partly supersedes ADR-0002)

ADR-0002 gave `MANAGE_MEMBERS` two jobs: managing who is in the Group (inviting people, handling Invitations, removing Members) and deciding what Members may do (granting and revoking Claims). Groups want to hand those out separately: someone who runs the choir's membership list shouldn't automatically decide who can change content or who else can manage members. So granting Claims moves to a new Claim, `MANAGE_MEMBER_AUTHORIZATION` (Swedish UI _Hantera behörigheter_). `MANAGE_MEMBERS` keeps inviting, Invitations and removing Members.

A `MANAGE_MEMBER_AUTHORIZATION` holder can grant or revoke any Claim on any other Member, including `MANAGE_MEMBERS`, `MANAGE_MEMBER_AUTHORIZATION` itself, and Claims they don't hold. The name is deliberately broader than "manage Claims": a planned role system (named groups of Claims) will come under this same Claim rather than adding another.

Neither Claim implies or requires the other, nor any other Claim, as ADR-0012 already holds for the content Claims. The Creator still implicitly holds every Claim, and the target guards are unchanged: no one can remove or change the Claims of themselves or the Creator. Either Claim opens the members page and its list of Members with their Claims; each control on it shows only for the Claim it needs.

## Considered options

- **Keep one Claim and add a per-Claim grant rule** (for example, you may only grant Claims you hold). Rejected: it doesn't separate the two jobs, and any rule limiting which Claims a holder may grant is its own decision, out of scope here.
- **Call it `MANAGE_CLAIMS`.** Rejected: the role system to come is also about authorization but isn't a Claim, and one name should cover both.

## Consequences

- A migration backfills `MANAGE_MEMBER_AUTHORIZATION` for every Member who held `MANAGE_MEMBERS` when it ran, in every Group, so nobody loses a capability. Removing it from those who shouldn't have it is left to each Group.
- Group access gains `viewMembers` (either Claim) and splits changing one Member into `removeMember` (`MANAGE_MEMBERS`) and `changeMemberClaims` (`MANAGE_MEMBER_AUTHORIZATION`), each refused with its own reason.
