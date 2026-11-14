import type { ReactNode } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { getAppEnvironment } from "@/lib/app-environment";

/** Settings naming an address that an email is sent to, such as the Feedback inbox. */
export type RecipientEnvVar = "FEEDBACK_EMAIL_TO";

type EmailEnvVar = "RESEND_API_KEY" | "EMAIL_FROM" | RecipientEnvVar;

let cachedClient: Resend | null = null;

function readEnv(name: EmailEnvVar): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getRequiredEnv(name: EmailEnvVar): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Saknar miljövariabel: ${name}`);
  }
  return value;
}

function getResendClient(): Resend {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new Resend(getRequiredEnv("RESEND_API_KEY"));
  return cachedClient;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  react: ReactNode;
  /** Where a reply from a mail client goes, when not to EMAIL_FROM. */
  replyTo?: string;
};

// Locally without a Resend key, emails are printed to the server console so a
// developer can still follow links (e.g. verification) without real sending.
// Staging and production never take this path: there a missing setting throws,
// so emails can't silently disappear.
function shouldPrintToConsole(): boolean {
  return getAppEnvironment() === "local" && !readEnv("RESEND_API_KEY");
}

/**
 * The address in `name`, for emails sent to a fixed inbox. Locally while
 * emails are only printed, a missing one becomes a placeholder so the email
 * still shows up in the console; wherever emails really go out it throws.
 */
export function emailRecipientFromEnv(name: RecipientEnvVar): string {
  if (shouldPrintToConsole()) {
    return readEnv(name) ?? `(${name} saknas)`;
  }
  return getRequiredEnv(name);
}

async function printToConsole({ to, subject, react, replyTo }: SendEmailInput): Promise<void> {
  const text = await render(react, { plainText: true });
  const from = readEnv("EMAIL_FROM") ?? "(EMAIL_FROM saknas)";
  const rule = "─".repeat(60);

  console.info(
    [
      rule,
      "E-post (inte skickad – RESEND_API_KEY saknas lokalt)",
      `Från:    ${from}`,
      `Till:    ${to}`,
      ...(replyTo ? [`Svar till: ${replyTo}`] : []),
      `Ämne:    ${subject}`,
      "",
      text,
      rule,
    ].join("\n")
  );
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (shouldPrintToConsole()) {
    await printToConsole(input);
    return;
  }

  const { to, subject, react, replyTo } = input;
  const { error } = await getResendClient().emails.send({
    from: getRequiredEnv("EMAIL_FROM"),
    to,
    subject,
    react,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    throw new Error(`Kunde inte skicka e-post: ${error.message}`);
  }
}
