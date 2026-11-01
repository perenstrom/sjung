import type { ReactNode } from "react";
import { Resend } from "resend";

type RequiredEmailEnvVar = "RESEND_API_KEY" | "EMAIL_FROM";

let cachedClient: Resend | null = null;

function getRequiredEnv(name: RequiredEmailEnvVar): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Saknar miljövariabel: ${name}`);
  }
  return value.trim();
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
