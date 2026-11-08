import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

function captureConsole() {
  return vi.spyOn(console, "info").mockImplementation(() => {});
}

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

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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

  describe("when running locally", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("APP_ENV", "");
    });

    const verifyEmail = createElement(
      "p",
      null,
      "Bekräfta din adress: ",
      createElement("a", { href: "http://localhost:3000/auth/verify?token=abc" }, "bekräfta")
    );

    it("prints the email to the console instead of sending when RESEND_API_KEY is missing", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const info = captureConsole();
      const sendEmail = await loadSendEmail();

      await sendEmail({ to: "anna@example.com", subject: "Bekräfta din e-post", react: verifyEmail });

      expect(send).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledTimes(1);
      const printed = String(info.mock.calls[0][0]);
      expect(printed).toContain("anna@example.com");
      expect(printed).toContain("Sjung <noreply@per.fyi>");
      expect(printed).toContain("Bekräfta din e-post");
      expect(printed).toContain("http://localhost:3000/auth/verify?token=abc");
    });

    it("prints a placeholder sender when EMAIL_FROM is missing too", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("EMAIL_FROM", "");
      const info = captureConsole();
      const sendEmail = await loadSendEmail();

      await sendEmail({ to: "anna@example.com", subject: "Bekräfta din e-post", react: verifyEmail });

      expect(send).not.toHaveBeenCalled();
      expect(String(info.mock.calls[0][0])).toContain("(EMAIL_FROM saknas)");
    });

    it("sends through Resend when RESEND_API_KEY is set", async () => {
      const info = captureConsole();
      const sendEmail = await loadSendEmail();

      await sendEmail({ to: "anna@example.com", subject: "Bekräfta din e-post", react: verifyEmail });

      expect(send).toHaveBeenCalledTimes(1);
      expect(info).not.toHaveBeenCalled();
    });

    it("still requires EMAIL_FROM when sending through Resend", async () => {
      vi.stubEnv("EMAIL_FROM", "");
      const sendEmail = await loadSendEmail();

      await expect(
        sendEmail({ to: "anna@example.com", subject: "Välkommen", react: verifyEmail })
      ).rejects.toThrow("Saknar miljövariabel: EMAIL_FROM");
      expect(send).not.toHaveBeenCalled();
    });

    it("fails loudly when the template can't be rendered", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const info = captureConsole();
      function Broken(): never {
        throw new Error("Trasig mall");
      }
      const sendEmail = await loadSendEmail();

      await expect(
        sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement(Broken) })
      ).rejects.toThrow("Trasig mall");
      expect(info).not.toHaveBeenCalled();
    });
  });

  describe.each(["staging", "production", undefined])(
    "when deployed with APP_ENV=%s",
    (appEnv) => {
      beforeEach(() => {
        vi.stubEnv("NODE_ENV", "production");
        vi.stubEnv("APP_ENV", appEnv);
      });

      it.each(["RESEND_API_KEY", "EMAIL_FROM"])(
        "throws without sending or printing when %s is missing",
        async (name) => {
          vi.stubEnv(name, "");
          const info = captureConsole();
          const sendEmail = await loadSendEmail();

          await expect(
            sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement("p") })
          ).rejects.toThrow(`Saknar miljövariabel: ${name}`);
          expect(send).not.toHaveBeenCalled();
          expect(info).not.toHaveBeenCalled();
        }
      );
    }
  );
});
