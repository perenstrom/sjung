import { readdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { OutboxEmail } from "@/lib/email";

/**
 * Where the e2e server writes the emails it sends (`EMAIL_OUTBOX_DIR`, see
 * `sendEmail` in lib/email.ts). Set on the server by playwright.config.ts.
 */
export const E2E_OUTBOX_DIR = resolve(__dirname, "..", "..", ".e2e-outbox");

export type ReceivedEmail = { subject: string; text: string; links: string[] };

const WAIT_MS = 5_000;
const POLL_MS = 100;

/** Empties the outbox and keeps the folder, if there is one. */
export async function emptyOutbox(): Promise<void> {
  const names = await readdir(E2E_OUTBOX_DIR).catch(() => []);
  await Promise.all(
    names.map((name) => rm(join(E2E_OUTBOX_DIR, name), { recursive: true, force: true }))
  );
}

/**
 * The newest email the app sent to `address`. Emails are often sent after the
 * response (`after()`), so this keeps looking for a few seconds.
 */
export async function latestEmailTo(address: string): Promise<ReceivedEmail> {
  const deadline = Date.now() + WAIT_MS;

  for (;;) {
    const names = await readdir(E2E_OUTBOX_DIR).catch(() => null);
    const email = names && (await newestTo(address, names));
    if (email) {
      return { subject: email.subject, text: email.text, links: linksIn(email.text) };
    }

    if (Date.now() >= deadline) {
      throw new Error(
        names
          ? `Inget mejl till ${address} i ${E2E_OUTBOX_DIR} inom ${WAIT_MS / 1000} s.`
          : `Hittar inte ${E2E_OUTBOX_DIR}. Startades servern med EMAIL_OUTBOX_DIR=.e2e-outbox? ` +
              "Playwright återanvänder en server du själv startat på port 3100."
      );
    }
    await new Promise((done) => setTimeout(done, POLL_MS));
  }
}

async function newestTo(address: string, names: string[]): Promise<OutboxEmail | null> {
  // File names start with the send time, so the newest sorts last.
  const files = names.filter((name) => name.endsWith(".json")).sort().reverse();
  for (const name of files) {
    const email: OutboxEmail = JSON.parse(await readFile(join(E2E_OUTBOX_DIR, name), "utf8"));
    if (email.to === address) {
      return email;
    }
  }
  return null;
}

function linksIn(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
}
