import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { sendEmail } from "@/lib/email";
import { testPrisma } from "../support/db";
import { failEmailsTo, sentEmails } from "../support/fake-email";
import { createUser } from "../support/fixtures";

// Every integration test leans on ../support/setup.ts resetting the database
// and the email fake between tests. The first test leaves a row, a sent email
// and a failing recipient behind; the second proves all three were cleared.
describe("test isolation", () => {
  const greeting = createElement("p", null, "Hej Anna!");

  it("leaves a User, a sent email and a failing recipient behind", async () => {
    await createUser({ email: "anna@example.com" });
    failEmailsTo("anna@example.com");

    await expect(sendEmail({ to: "anna@example.com", subject: "Välkommen", react: greeting })).rejects.toThrow();
    await sendEmail({ to: "bertil@example.com", subject: "Välkommen", react: greeting });

    expect(sentEmails().map((email) => email.to)).toEqual(["bertil@example.com"]);
  });

  it("starts the next test with an empty database and nothing sent or failing", async () => {
    expect(await testPrisma.user.count()).toBe(0);
    expect(sentEmails()).toEqual([]);

    await sendEmail({ to: "anna@example.com", subject: "Välkommen", react: greeting });

    expect(sentEmails()).toEqual([
      { to: "anna@example.com", subject: "Välkommen", react: greeting, text: "Hej Anna!" },
    ]);
  });
});
