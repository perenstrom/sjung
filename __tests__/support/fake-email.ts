import { render } from "@react-email/render";

import type { SendEmailInput } from "@/lib/email";

// Shared stand-in for `@/lib/email`, swapped in for every integration test by
// `vi.mock` in ./setup.ts so no test can send real email.

export type SentEmail = SendEmailInput & { text: string };

let sent: SentEmail[] = [];
let failingRecipients = new Set<string>();

export async function sendEmail({ to, subject, react }: SendEmailInput): Promise<void> {
  // Rendering on every send means a template that crashes fails the test
  // here instead of in production.
  const text = await render(react, { plainText: true });
  if (failingRecipients.has(to)) {
    throw new Error(`Kunde inte skicka e-post: testfel för ${to}`);
  }
  sent.push({ to, subject, react, text });
}

export function sentEmails(): SentEmail[] {
  return [...sent];
}

export function failEmailsTo(address: string) {
  failingRecipients.add(address);
}

export function resetFakeEmail() {
  sent = [];
  failingRecipients = new Set();
}
