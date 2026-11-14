import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { createUser } from "../support/fixtures";
import { failEmailsTo, sentEmails } from "../support/fake-email";
import { formData } from "../support/form-data";
import { actAs, actAsAnonymous } from "../support/session";
import { sendFeedback } from "@/app/actions/feedback";

const FEEDBACK_INBOX = "feedback@sjung.test";

function feedbackForm(message: string) {
  return formData({
    message,
    pagePath: "/app/korus/setlists",
    groupSlug: "korus",
    userAgent: "Mozilla/5.0 (Testbrowser)",
  });
}

beforeEach(() => {
  vi.stubEnv("FEEDBACK_EMAIL_TO", FEEDBACK_INBOX);
  vi.stubEnv("APP_ENV", "staging");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendFeedback", () => {
  it("emails the Feedback to the Feedback inbox, with the sender as reply-to and the page context", async () => {
    const user = await createUser({ name: "Anna Andersson", email: "anna@example.com" });
    actAs(user.id);

    const result = await sendFeedback(null, feedbackForm("  Knappen för att spara syns inte på mobilen.  "));

    expect(result).toEqual({ status: "sent" });
    const emails = sentEmails();
    expect(emails).toHaveLength(1);
    const [email] = emails;
    expect(email.to).toBe(FEEDBACK_INBOX);
    expect(email.replyTo).toBe("anna@example.com");
    expect(email.subject).toBe("[staging] Feedback från Anna Andersson");
    expect(email.text).toContain("Knappen för att spara syns inte på mobilen.");
    expect(email.text).toContain("Anna Andersson");
    expect(email.text).toContain("anna@example.com");
    expect(email.text).toContain("/app/korus/setlists");
    expect(email.text).toContain("korus");
    expect(email.text).toContain("staging");
    expect(email.text).toContain("Mozilla/5.0 (Testbrowser)");
  });

  it("leaves the Group out when the page isn't inside one", async () => {
    const user = await createUser();
    actAs(user.id);

    await sendFeedback(null, formData({ message: "Hej", pagePath: "/app/me/groups", groupSlug: "", userAgent: "UA" }));

    expect(sentEmails()[0].text).not.toMatch(/Grupp:/);
  });

  it.each([
    ["a blank message", "   ", "Skriv din feedback innan du skickar", ""],
    ["a message over 5 000 characters", "a".repeat(5001), "Feedbacken får vara högst 5 000 tecken", "a".repeat(5001)],
  ])("rejects %s without sending, keeping what was typed", async (_label, message, error, kept) => {
    const user = await createUser();
    actAs(user.id);

    await expect(sendFeedback(null, feedbackForm(message))).resolves.toEqual({
      status: "error",
      error,
      values: { message: kept },
    });
    expect(sentEmails()).toEqual([]);
  });

  it("rejects an Unverified user without sending", async () => {
    const user = await createUser({ emailVerifiedAt: null });
    actAs(user.id);

    await expect(sendFeedback(null, feedbackForm("Hej"))).rejects.toThrow();
    expect(sentEmails()).toEqual([]);
  });

  it("rejects a caller without a session without sending", async () => {
    actAsAnonymous();

    await expect(sendFeedback(null, feedbackForm("Hej"))).rejects.toThrow();
    expect(sentEmails()).toEqual([]);
  });

  it("answers with an error and keeps the message when sending fails", async () => {
    const user = await createUser();
    actAs(user.id);
    failEmailsTo(FEEDBACK_INBOX);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendFeedback(null, feedbackForm("  Hej  "))).resolves.toEqual({
      status: "error",
      error: "Kunde inte skicka feedback. Försök igen.",
      values: { message: "Hej" },
    });
  });

  it("answers with an error and keeps the message when FEEDBACK_EMAIL_TO is missing", async () => {
    vi.stubEnv("FEEDBACK_EMAIL_TO", "");
    const user = await createUser();
    actAs(user.id);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendFeedback(null, feedbackForm("Hej"))).resolves.toEqual({
      status: "error",
      error: "Kunde inte skicka feedback. Försök igen.",
      values: { message: "Hej" },
    });
    expect(sentEmails()).toEqual([]);
    expect(String(logged.mock.calls[0]?.[1])).toContain("FEEDBACK_EMAIL_TO");
  });
});
