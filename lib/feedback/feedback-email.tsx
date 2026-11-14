import { EmailLayout } from "@/lib/email-layout";
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
    <EmailLayout>
      <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
      <hr />
      {details.map(([label, value]) => (
        <p key={label} style={{ margin: 0, color: "#666" }}>
          {label}: {value}
        </p>
      ))}
    </EmailLayout>
  );
}
