export const VERIFICATION_EMAIL_SUBJECT = "Bekräfta din e-postadress för Sjung";

type VerificationEmailProps = {
  name: string;
  confirmUrl: string;
  validForHours: number;
};

export function VerificationEmail({ name, confirmUrl, validForHours }: VerificationEmailProps) {
  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.5 }}>
        <p>Hej {name}!</p>
        <p>Bekräfta din e-postadress för att börja använda Sjung.</p>
        <p>
          <a
            href={confirmUrl}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: "6px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Bekräfta e-postadressen
          </a>
        </p>
        <p>Länken gäller i {validForHours} timmar.</p>
        <p style={{ color: "#666" }}>
          Om du inte har skapat ett konto på Sjung kan du ignorera det här mejlet.
        </p>
      </body>
    </html>
  );
}
