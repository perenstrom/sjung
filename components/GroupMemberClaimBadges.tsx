import type { GroupClaim } from "@/app/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { GROUP_CLAIM_OPTIONS } from "@/lib/group-claims";

export function GroupMemberClaimBadges({
  member,
}: {
  member: { isCreator: boolean; claims: GroupClaim[] };
}) {
  if (member.isCreator) {
    return <Badge>Administratör</Badge>;
  }
  const held = GROUP_CLAIM_OPTIONS.filter(({ claim }) => member.claims.includes(claim));
  if (held.length === 0) {
    return <span className="text-muted-foreground">–</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {held.map(({ claim, label }) => (
        <Badge key={claim} variant="outline">
          {label}
        </Badge>
      ))}
    </div>
  );
}
