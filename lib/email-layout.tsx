import type { ReactNode } from "react";
import { appUrl } from "@/lib/app-base-url";
import { PRIVACY_POLICY_PATH, TERMS_OF_USE_PATH } from "@/lib/legal/routes";

type EmailLayoutProps = {
  children: ReactNode;
  /**
   * Whether the footer links the Privacy policy and Terms of use. On for
   * every email to Users and invited addresses; off only for emails to the
   * people running Sjung, such as Feedback.
   */
  legalFooter?: boolean;
};

/** The outer document every email Sjung sends shares. */
export function EmailLayout({ children, legalFooter = true }: EmailLayoutProps) {
  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.5 }}>
        {children}
        {legalFooter ? <LegalFooter /> : null}
      </body>
    </html>
  );
}

function LegalFooter() {
  const linkStyle = { color: "#666" };
  return (
    <>
      <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "24px 0 12px" }} />
      <p style={{ color: "#666", fontSize: "12px" }}>
        <a href={appUrl(PRIVACY_POLICY_PATH)} style={linkStyle}>
          Integritetspolicy
        </a>
        {" · "}
        <a href={appUrl(TERMS_OF_USE_PATH)} style={linkStyle}>
          Användarvillkor
        </a>
      </p>
    </>
  );
}

/** The primary call to action in an email: a link styled as a button. */
export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p>
      <a
        href={href}
        style={{
          display: "inline-block",
          padding: "10px 16px",
          borderRadius: "6px",
          background: "#111",
          color: "#fff",
          textDecoration: "none",
        }}
      >
        {children}
      </a>
    </p>
  );
}
