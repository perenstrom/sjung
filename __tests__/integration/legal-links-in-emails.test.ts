import argon2 from "argon2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUser } from "../support/fixtures";
import { sentEmails } from "../support/fake-email";
import { inviteToNewGroup } from "../support/invitations";
import { deleteAccount } from "@/lib/account/account-deletion";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { sendFeedbackEmail } from "@/lib/feedback/feedback";

const PRIVACY_POLICY_URL = "http://sjung.test/privacy";
const TERMS_OF_USE_URL = "http://sjung.test/terms";

describe("emails sent to Users and invited addresses", () => {
  it.each([
    [
      "email verification",
      async () => sendVerificationEmail((await createUser({ emailVerifiedAt: null })).id),
    ],
    [
      "password reset",
      async () => {
        await createUser({ email: "anna@example.com" });
        await requestPasswordReset("anna@example.com");
      },
    ],
    ["an Invitation", async () => void (await inviteToNewGroup("bertil@example.com"))],
    [
      "the Account deletion receipt",
      async () => {
        const user = await createUser({ passwordHash: await argon2.hash("ett långt lösenord") });
        await deleteAccount(user.id, "ett långt lösenord");
      },
    ],
  ])("link to the Privacy policy and Terms of use: %s", async (_kind, send) => {
    await send();

    const email = sentEmails().at(-1)!;
    expect(email.text).toContain(PRIVACY_POLICY_URL);
    expect(email.text).toContain(TERMS_OF_USE_URL);
  });
});

describe("the Feedback email", () => {
  beforeEach(() => {
    vi.stubEnv("FEEDBACK_EMAIL_TO", "feedback@sjung.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("links to neither, since it goes to the people running Sjung", async () => {
    await sendFeedbackEmail(
      { name: "Anna", email: "anna@example.com" },
      { message: "Hej", pagePath: "/app", groupSlug: null, userAgent: "UA" }
    );

    const [email] = sentEmails();
    expect(email.text).not.toContain(PRIVACY_POLICY_URL);
    expect(email.text).not.toContain(TERMS_OF_USE_URL);
  });
});
