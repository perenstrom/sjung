import type { ReactNode } from "react";

/** The outer document every email Sjung sends shares. */
export function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.5 }}>{children}</body>
    </html>
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
