export const PASSWORD_RESET_EMAIL_SUBJECT = "Återställ ditt lösenord för Sjung";

type PasswordResetEmailProps = {
  name: string;
  resetUrl: string;
};

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.5 }}>
        <p>Hej {name}!</p>
        <p>Någon har bett om att få återställa lösenordet till ditt konto på Sjung.</p>
        <p>
          <a
            href={resetUrl}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: "6px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Välj ett nytt lösenord
          </a>
        </p>
        <p>Länken gäller i 1 timme och kan bara användas en gång.</p>
        <p style={{ color: "#666" }}>
          Om det inte var du kan du ignorera det här mejlet. Ditt lösenord ändras inte.
        </p>
      </body>
    </html>
  );
}
