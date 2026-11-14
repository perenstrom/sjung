import { EmailButton, EmailLayout } from "@/lib/email-layout";

export function invitationEmailSubject(groupName: string): string {
  return `Du har bjudits in till ${groupName} på Sjung`;
}

type InvitationEmailProps = {
  groupName: string;
  /** Null when the sender's account no longer exists. */
  inviterName: string | null;
  acceptUrl: string;
  validForDays: number;
};

export function InvitationEmail({ groupName, inviterName, acceptUrl, validForDays }: InvitationEmailProps) {
  return (
    <EmailLayout>
      <p>Hej!</p>
      <p>
        {inviterName ? `${inviterName} har bjudit in dig` : "Du har bjudits in"} att gå med i{" "}
        <strong>{groupName}</strong> på Sjung.
      </p>
      <EmailButton href={acceptUrl}>Visa inbjudan</EmailButton>
      <p>Länken gäller i {validForDays} dagar.</p>
      <p style={{ color: "#666" }}>
        Om du inte väntade dig den här inbjudan kan du ignorera det här mejlet.
      </p>
    </EmailLayout>
  );
}
