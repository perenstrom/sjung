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
  /** The version the sender's browser page showed; untrusted, empty when unknown. */
  browserAppVersion: string;
  /** The version the server ran when sending, from appVersion(). */
  serverAppVersion: string;
};

const UNKNOWN = "(okänd)";

/**
 * One line when the sender's page ran what the server runs, otherwise both, so
 * Feedback from a tab left open across a deploy says which version it was about.
 */
function versionDetails(browserAppVersion: string, serverAppVersion: string): Array<[string, string]> {
  if (browserAppVersion === serverAppVersion) return [["Version", serverAppVersion]];
  return [
    ["Version i webbläsaren", browserAppVersion || UNKNOWN],
    ["Version på servern", serverAppVersion],
  ];
}

export function FeedbackEmail({
  message,
  sender,
  pagePath,
  groupSlug,
  environment,
  userAgent,
  browserAppVersion,
  serverAppVersion,
}: FeedbackEmailProps) {
  const details: Array<[string, string]> = [
    ["Från", `${sender.name} <${sender.email}>`],
    ["Sida", pagePath || UNKNOWN],
    ...(groupSlug ? [["Grupp", groupSlug] as [string, string]] : []),
    ...versionDetails(browserAppVersion, serverAppVersion),
    ["Miljö", environment],
    ["Webbläsare", userAgent || UNKNOWN],
  ];

  return (
    <EmailLayout legalFooter={false}>
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
