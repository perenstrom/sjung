import { GroupClaim } from "@/app/generated/prisma/enums";

/** Every Claim with its Swedish UI label and description, in display order. */
export const GROUP_CLAIM_OPTIONS: {
  claim: GroupClaim;
  label: string;
  description: string;
}[] = [
  {
    claim: GroupClaim.MANAGE_MEMBERS,
    label: "Hantera medlemmar",
    description: "Kan lägga till och ta bort medlemmar och ändra andras behörigheter.",
  },
  {
    claim: GroupClaim.MANAGE_CONTENT,
    label: "Hantera innehåll",
    description: "Kan skapa, redigera och ta bort gruppens innehåll.",
  },
];
