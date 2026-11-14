import type { AppEnvironment } from "@/lib/app-environment";

export function feedbackEmailSubject(environment: AppEnvironment, senderName: string): string {
  return `[${environment}] Feedback från ${senderName}`;
}

export type FeedbackSender = { name: string; email: string };

export type FeedbackEmailProps = {
  message: string;
  sender: FeedbackSender;
  pagePath: string;
  groupSlug: string | null;
  environment: AppEnvironment;
  userAgent: string;
};

export function FeedbackEmail({
  message,
  sender,
  pagePath,
  groupSlug,
  environment,
  userAgent,
}: FeedbackEmailProps) {
  const details: Array<[string, string]> = [
    ["Från", `${sender.name} <${sender.email}>`],
    ["Sida", pagePath || "(okänd)"],
    ...(groupSlug ? [["Grupp", groupSlug] as [string, string]] : []),
    ["Miljö", environment],
    ["Webbläsare", userAgent || "(okänd)"],
  ];

  return (
    <html lang="sv">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111", lineHeight: 1.5 }}>
        <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
        <hr />
        {details.map(([label, value]) => (
          <p key={label} style={{ margin: 0, color: "#666" }}>
            {label}: {value}
          </p>
        ))}
      </body>
    </html>
  );
}
