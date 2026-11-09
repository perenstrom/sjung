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
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.5 }}>
        <p>Hej!</p>
        <p>
          {inviterName ? `${inviterName} har bjudit in dig` : "Du har bjudits in"} att gå med i{" "}
          <strong>{groupName}</strong> på Sjung.
        </p>
        <p>
          <a
            href={acceptUrl}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: "6px",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Visa inbjudan
          </a>
        </p>
        <p>Länken gäller i {validForDays} dagar.</p>
        <p style={{ color: "#666" }}>
          Om du inte väntade dig den här inbjudan kan du ignorera det här mejlet.
        </p>
      </body>
    </html>
  );
}
