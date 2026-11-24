import { EmailLayout } from "@/lib/email-layout";

export const ACCOUNT_DELETED_EMAIL_SUBJECT = "Ditt konto på Sjung är borttaget";

type AccountDeletedEmailProps = {
  name: string;
};

/** The receipt sent to a User's former address once Account deletion has gone through. */
export function AccountDeletedEmail({ name }: AccountDeletedEmailProps) {
  return (
    <EmailLayout>
      <p>Hej {name}!</p>
      <p>Ditt konto på Sjung är nu borttaget, tillsammans med dina personuppgifter. Det går inte att ångra.</p>
      <p>Det du har lagt till i grupper som finns kvar ligger kvar i grupperna, men visas inte längre som ditt.</p>
      <p style={{ color: "#666" }}>
        Du får det här mejlet eftersom adressen hörde till kontot. Vi skickar inga fler mejl hit.
      </p>
    </EmailLayout>
  );
}
