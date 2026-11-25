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
    description: "Kan bjuda in och ta bort medlemmar och hantera inbjudningar.",
  },
  {
    claim: GroupClaim.MANAGE_MEMBER_AUTHORIZATION,
    label: "Hantera behörigheter",
    description: "Kan ge och ta bort behörigheter för andra medlemmar.",
  },
  {
    claim: GroupClaim.MANAGE_CONTENT,
    label: "Hantera innehåll",
    description: "Kan skapa, redigera och ta bort gruppens innehåll.",
  },
  {
    claim: GroupClaim.REORDER_SET_LISTS,
    label: "Ändra ordning i repertoarer",
    description: "Kan flytta om stycken och anteckningar i gruppens repertoarer.",
  },
  {
    claim: GroupClaim.MANAGE_RUNNING_ORDER_NOTES,
    label: "Hantera anteckningar i repertoarer",
    description: "Kan lägga till, ändra och ta bort anteckningar mellan styckena i gruppens repertoarer.",
  },
];
