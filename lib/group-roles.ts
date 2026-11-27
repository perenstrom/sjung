import type { GroupClaim } from "@/app/generated/prisma/enums";
import { GROUP_CLAIM_OPTIONS } from "@/lib/group-claims";

/** A Role as far as working out a Member's Claims needs it. */
export type RoleClaims = { id: string; name: string; claims: readonly GroupClaim[] };

/** One Claim a Member holds, and where it comes from. */
export type HeldClaim = {
  claim: GroupClaim;
  label: string;
  /** Held on the membership itself: the only kind that can be ticked or unticked. */
  individual: boolean;
  /** The names of the Member's Roles that give it, in the order of `roles`. */
  viaRoles: string[];
};

/** The Roles a Member holds, in the order of `roles`. */
export function rolesOf<TRole extends RoleClaims>(
  member: { roleIds: readonly string[] },
  roles: readonly TRole[],
): TRole[] {
  return roles.filter((role) => member.roleIds.includes(role.id));
}

/** A Role's Claims as one line of their labels in display order, or a note that it has none. */
export function roleClaimSummary(role: Pick<RoleClaims, "claims">): string {
  const labels = GROUP_CLAIM_OPTIONS.filter(({ claim }) => role.claims.includes(claim)).map(({ label }) => label);
  return labels.length > 0 ? labels.join(", ") : "Inga behörigheter";
}

/**
 * Every Claim a Member holds, individually or through their Roles, each once
 * and in display order. A Role is a live link, so this is worked out from the
 * Roles as they are now.
 */
export function heldClaims(
  member: { claims: readonly GroupClaim[]; roleIds: readonly string[] },
  roles: readonly RoleClaims[],
): HeldClaim[] {
  const memberRoles = rolesOf(member, roles);
  return GROUP_CLAIM_OPTIONS.map(({ claim, label }) => ({
    claim,
    label,
    individual: member.claims.includes(claim),
    viaRoles: memberRoles.filter((role) => role.claims.includes(claim)).map((role) => role.name),
  })).filter((held) => held.individual || held.viaRoles.length > 0);
}
