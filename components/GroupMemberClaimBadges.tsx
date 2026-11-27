import { Badge } from "@/components/ui/badge";
import type { HeldClaim } from "@/lib/group-roles";
import { cn } from "@/lib/utils";

/** A Member's Claims as badges, each saying whether it is held individually or via which Roles. */
export function GroupMemberClaimBadges({
  member,
  empty = <span className="text-muted-foreground">–</span>,
  className,
}: {
  member: { isCreator: boolean; heldClaims: HeldClaim[] };
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
  if (member.heldClaims.length === 0) {
    return empty;
  }
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {member.heldClaims.map(({ claim, label, individual, viaRoles }) => (
        <Badge key={claim} variant="outline">
          {label}
          {individual ? null : (
            <>
              {" "}
              <span className="font-normal text-muted-foreground">via {viaRoles.join(", ")}</span>
            </>
          )}
        </Badge>
      ))}
    </div>
  );
}
