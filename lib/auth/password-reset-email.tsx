import { EmailButton, EmailLayout } from "@/lib/email-layout";

export const PASSWORD_RESET_EMAIL_SUBJECT = "Återställ ditt lösenord för Sjung";

type PasswordResetEmailProps = {
  name: string;
  resetUrl: string;
  validForHours: number;
};

export function PasswordResetEmail({ name, resetUrl, validForHours }: PasswordResetEmailProps) {
  return (
    <EmailLayout>
      <p>Hej {name}!</p>
      <p>Någon har bett om att få återställa lösenordet till ditt konto på Sjung.</p>
      <EmailButton href={resetUrl}>Välj ett nytt lösenord</EmailButton>
      <p>Länken gäller i {hoursInSwedish(validForHours)} och kan bara användas en gång.</p>
      <p style={{ color: "#666" }}>Om det inte var du kan du ignorera det här mejlet. Ditt lösenord ändras inte.</p>
    </EmailLayout>
  );
}

export function hoursInSwedish(hours: number): string {
  return hours === 1 ? "1 timme" : `${hours} timmar`;
}
