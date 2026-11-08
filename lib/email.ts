import type { ReactNode } from "react";
import { Resend } from "resend";

type EmailEnvVar = "RESEND_API_KEY" | "EMAIL_FROM";

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
};

export async function sendEmail({ to, subject, react }: SendEmailInput): Promise<void> {
  const { error } = await getResendClient().emails.send({
    from: getRequiredEnv("EMAIL_FROM"),
    to,
    subject,
    react,
  });

  if (error) {
    throw new Error(`Kunde inte skicka e-post: ${error.message}`);
  }
}
