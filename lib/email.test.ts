import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

async function loadSendEmail() {
  // Fresh module per test so the lazily cached Resend client never leaks
  // between tests that change the environment.
  vi.resetModules();
  const { sendEmail } = await import("@/lib/email");
  return sendEmail;
}

describe("sendEmail", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: "email-1" }, error: null, headers: null });
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Sjung <noreply@per.fyi>");
  });

  it("sends one email to the recipient from EMAIL_FROM", async () => {
    const sendEmail = await loadSendEmail();
    const react = createElement("p", null, "Hej!");

    await sendEmail({ to: "anna@example.com", subject: "Välkommen", react });

    expect(send).toHaveBeenCalledWith({
      from: "Sjung <noreply@per.fyi>",
      to: "anna@example.com",
      subject: "Välkommen",
      react,
    });
  });

  it("throws when Resend reports an error", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field", statusCode: 422 },
      headers: null,
    });
    const sendEmail = await loadSendEmail();

    await expect(
      sendEmail({ to: "not-an-email", subject: "Välkommen", react: createElement("p") })
    ).rejects.toThrow("Invalid `to` field");
  });

  it.each(["RESEND_API_KEY", "EMAIL_FROM"])(
    "throws without sending when %s is missing",
    async (name) => {
      vi.stubEnv(name, "");
      const sendEmail = await loadSendEmail();

      await expect(
        sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement("p") })
      ).rejects.toThrow(`Saknar miljövariabel: ${name}`);
      expect(send).not.toHaveBeenCalled();
    }
  );
});
