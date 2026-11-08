import type { GroupClaim } from "@/app/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { GROUP_CLAIM_OPTIONS } from "@/lib/group-claims";
import { cn } from "@/lib/utils";

export function GroupMemberClaimBadges({
  member,
  empty = <span className="text-muted-foreground">–</span>,
  className,
}: {
  member: { isCreator: boolean; claims: GroupClaim[] };
  /** Shown when the member holds no Claim. Pass null to render nothing. */
  empty?: React.ReactNode;
  className?: string;
}) {
  if (member.isCreator) {
    return (
      <div className={cn("flex", className)}>
        <Badge>Administratör</Badge>
      </div>
    );
  }
  const heldClaims = GROUP_CLAIM_OPTIONS.filter(({ claim }) => member.claims.includes(claim));
  if (heldClaims.length === 0) {
    return empty;
  }
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {heldClaims.map(({ claim, label }) => (
        <Badge key={claim} variant="outline">
          {label}
        </Badge>
      ))}
    </div>
  );
}
