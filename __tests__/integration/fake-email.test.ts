import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { sendEmail } from "@/lib/email";
import { failEmailsTo, sentEmails } from "../support/fake-email";

function Greeting({ name }: { name: string }) {
  return createElement("p", null, `Hej ${name}!`);
}

describe("fake email", () => {
  it("records each send with its rendered plain text instead of sending it", async () => {
    const react = createElement(Greeting, { name: "Anna" });

    await sendEmail({ to: "anna@example.com", subject: "Välkommen", react });

    expect(sentEmails()).toEqual([
      { to: "anna@example.com", subject: "Välkommen", react, text: "Hej Anna!" },
    ]);
  });

  it("throws for a recipient marked to fail, without blocking other recipients", async () => {
    failEmailsTo("bertil@example.com");

    await expect(
      sendEmail({
        to: "bertil@example.com",
        subject: "Välkommen",
        react: createElement(Greeting, { name: "Bertil" }),
      })
    ).rejects.toThrow();
    await sendEmail({
      to: "anna@example.com",
      subject: "Välkommen",
      react: createElement(Greeting, { name: "Anna" }),
    });

    expect(sentEmails().map((email) => email.to)).toEqual(["anna@example.com"]);
  });

  it("fails the send when the template crashes while rendering", async () => {
    function BrokenTemplate(): never {
      throw new Error("template exploded");
    }

    await expect(
      sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement(BrokenTemplate) })
    ).rejects.toThrow("template exploded");
    expect(sentEmails()).toEqual([]);
  });

  // Runs after the tests above have sent mail and marked a failing recipient,
  // so it proves setup.ts resets the fake between tests.
  it("starts each test with nothing sent and no failing recipients", async () => {
    expect(sentEmails()).toEqual([]);

    await sendEmail({
      to: "bertil@example.com",
      subject: "Välkommen",
      react: createElement(Greeting, { name: "Bertil" }),
    });

    expect(sentEmails().map((email) => email.to)).toEqual(["bertil@example.com"]);
  });
});
