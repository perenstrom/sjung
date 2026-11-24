import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { getAppEnvironment } from "@/lib/app-environment";

/** Settings naming an address that an email is sent to, such as the Feedback inbox. */
export type RecipientEnvVar = "FEEDBACK_EMAIL_TO";

type EmailEnvVar = "RESEND_API_KEY" | "EMAIL_FROM" | "EMAIL_OUTBOX_DIR" | RecipientEnvVar;

let cachedClient: Resend | null = null;

function readEnv(name: EmailEnvVar): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** For emails that don't really go out: a missing setting shows as a placeholder. */
function readEnvOrPlaceholder(name: EmailEnvVar): string {
  return readEnv(name) ?? `(${name} saknas)`;
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

/**
 * Where emails go:
 * - "outbox": under EMAIL_OUTBOX_DIR (e2e tests only), each email is written
 *   to a JSON file there so Playwright can read it. Every real deployment has
 *   a Resend key, and setting both throws, so the outbox can't take over there.
 * - "console": locally without a Resend key, emails are printed to the server
 *   console so a developer can still follow links (e.g. verification).
 * - "resend": everywhere else. Staging and production always end up here, and
 *   a missing setting throws, so emails can't silently disappear.
 */
type EmailDelivery = { kind: "outbox"; dir: string } | { kind: "console" } | { kind: "resend" };

function emailDelivery(): EmailDelivery {
  const outboxDir = readEnv("EMAIL_OUTBOX_DIR");
  const hasResendKey = readEnv("RESEND_API_KEY") !== undefined;

  if (outboxDir) {
    if (hasResendKey) {
      throw new Error("Motstridiga miljövariabler: EMAIL_OUTBOX_DIR och RESEND_API_KEY får inte båda vara satta");
    }
    return { kind: "outbox", dir: outboxDir };
  }
  if (getAppEnvironment() === "local" && !hasResendKey) {
    return { kind: "console" };
  }
  return { kind: "resend" };
}

/**
 * The address in `name`, for emails sent to a fixed inbox. While emails are
 * only printed or written to the outbox, a missing one becomes a placeholder
 * so the email still shows up; wherever emails really go out it throws.
 */
export function emailRecipientFromEnv(name: RecipientEnvVar): string {
  if (emailDelivery().kind !== "resend") {
    return readEnvOrPlaceholder(name);
  }
  return getRequiredEnv(name);
}

/** One sent email as stored in the outbox; e2e/support/outbox.ts reads it. */
export type OutboxEmail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  sentAt: string;
};

async function writeToOutbox(dir: string, { to, subject, react, replyTo }: SendEmailInput): Promise<void> {
  const text = await render(react, { plainText: true });
  const sentAt = new Date().toISOString();
  const email: OutboxEmail = { to, subject, text, ...(replyTo ? { replyTo } : {}), sentAt };
  // Timestamp first, so sorting the file names sorts by send time.
  const path = join(dir, `${sentAt}-${randomUUID()}.json`);

  await mkdir(dir, { recursive: true });
  // Written aside and renamed into place, so a reader never sees half a file.
  await writeFile(`${path}.tmp`, JSON.stringify(email, null, 2));
  await rename(`${path}.tmp`, path);
}

async function printToConsole({ to, subject, react, replyTo }: SendEmailInput): Promise<void> {
  const text = await render(react, { plainText: true });
  const from = readEnvOrPlaceholder("EMAIL_FROM");
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
    ].join("\n"),
  );
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const delivery = emailDelivery();
  if (delivery.kind === "outbox") {
    await writeToOutbox(delivery.dir, input);
    return;
  }
  if (delivery.kind === "console") {
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
