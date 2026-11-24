import { EmailButton, EmailLayout } from "@/lib/email-layout";

export const VERIFICATION_EMAIL_SUBJECT = "Bekräfta din e-postadress för Sjung";

type VerificationEmailProps = {
  name: string;
  confirmUrl: string;
  validForHours: number;
};

export function VerificationEmail({ name, confirmUrl, validForHours }: VerificationEmailProps) {
  return (
    <EmailLayout>
      <p>Hej {name}!</p>
      <p>Bekräfta din e-postadress för att börja använda Sjung.</p>
      <EmailButton href={confirmUrl}>Bekräfta e-postadressen</EmailButton>
      <p>Länken gäller i {validForHours} timmar.</p>
      <p style={{ color: "#666" }}>Om du inte har skapat ett konto på Sjung kan du ignorera det här mejlet.</p>
    </EmailLayout>
  );
}
