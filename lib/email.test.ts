import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

  it("passes replyTo through to Resend", async () => {
    const sendEmail = await loadSendEmail();
    const react = createElement("p", null, "Hej!");

    await sendEmail({ to: "team@example.com", subject: "Feedback", react, replyTo: "anna@example.com" });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ replyTo: "anna@example.com" }));
  });

  it("throws when Resend reports an error", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field", statusCode: 422 },
      headers: null,
    });
    const sendEmail = await loadSendEmail();

    await expect(sendEmail({ to: "not-an-email", subject: "Välkommen", react: createElement("p") })).rejects.toThrow(
      "Invalid `to` field",
    );
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
      createElement("a", { href: "http://localhost:3000/auth/verify?token=abc" }, "bekräfta"),
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

    it("prints the reply-to address when there is one", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const info = captureConsole();
      const sendEmail = await loadSendEmail();

      await sendEmail({
        to: "team@example.com",
        subject: "Feedback",
        react: verifyEmail,
        replyTo: "anna@example.com",
      });

      expect(String(info.mock.calls[0][0])).toMatch(/Svar till:\s+anna@example\.com/);
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

      await expect(sendEmail({ to: "anna@example.com", subject: "Välkommen", react: verifyEmail })).rejects.toThrow(
        "Saknar miljövariabel: EMAIL_FROM",
      );
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
        sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement(Broken) }),
      ).rejects.toThrow("Trasig mall");
      expect(info).not.toHaveBeenCalled();
    });
  });

  describe("when EMAIL_OUTBOX_DIR is set", () => {
    let outboxDir: string;

    beforeEach(async () => {
      // A folder that doesn't exist yet, so the test also proves it's created.
      outboxDir = join(await mkdtemp(join(tmpdir(), "sjung-outbox-")), "outbox");
      vi.stubEnv("EMAIL_OUTBOX_DIR", outboxDir);
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("NODE_ENV", "production");
    });

    afterEach(async () => {
      await rm(dirname(outboxDir), { recursive: true, force: true });
    });

    async function outboxFiles() {
      const names = (await readdir(outboxDir)).sort();
      return Promise.all(
        names.map(async (name) => ({
          name,
          email: JSON.parse(await readFile(join(outboxDir, name), "utf8")),
        })),
      );
    }

    it("writes each email to its own JSON file instead of sending or printing it", async () => {
      const info = captureConsole();
      const sendEmail = await loadSendEmail();
      const react = createElement(
        "p",
        null,
        "Välj ett nytt lösenord: ",
        createElement("a", { href: "http://localhost:3100/auth/reset-password/new?token=abc" }, "här"),
      );

      await sendEmail({ to: "anna@example.com", subject: "Återställ lösenord", react });
      await sendEmail({ to: "team@example.com", subject: "Feedback", react, replyTo: "anna@example.com" });

      expect(send).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
      const files = await outboxFiles();
      expect(files).toHaveLength(2);
      for (const { name, email } of files) {
        // Named so that sorting the names sorts by send time.
        expect(name.startsWith(`${email.sentAt}-`)).toBe(true);
        expect(name.slice(email.sentAt.length + 1)).toMatch(/^[0-9a-f-]{36}\.json$/);
      }
      const [first, second] = files.map((file) => file.email);
      expect(first).toEqual({
        to: "anna@example.com",
        subject: "Återställ lösenord",
        text: expect.stringContaining("http://localhost:3100/auth/reset-password/new?token=abc"),
        sentAt: expect.any(String),
      });
      expect(new Date(first.sentAt).toISOString()).toBe(first.sentAt);
      expect(second).toMatchObject({ to: "team@example.com", replyTo: "anna@example.com" });
    });

    it("wins over the console fallback when running locally", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const info = captureConsole();
      const sendEmail = await loadSendEmail();

      await sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement("p") });

      expect(info).not.toHaveBeenCalled();
      expect(await outboxFiles()).toHaveLength(1);
    });

    it("throws without writing or sending when RESEND_API_KEY is set too", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test");
      const sendEmail = await loadSendEmail();

      await expect(
        sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement("p") }),
      ).rejects.toThrow("EMAIL_OUTBOX_DIR");
      expect(send).not.toHaveBeenCalled();
      await expect(readdir(outboxDir)).rejects.toThrow();
    });
  });

  describe.each(["staging", "production", undefined])("when deployed with APP_ENV=%s", (appEnv) => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("APP_ENV", appEnv);
    });

    it.each(["RESEND_API_KEY", "EMAIL_FROM"])("throws without sending or printing when %s is missing", async (name) => {
      vi.stubEnv(name, "");
      const info = captureConsole();
      const sendEmail = await loadSendEmail();

      await expect(
        sendEmail({ to: "anna@example.com", subject: "Välkommen", react: createElement("p") }),
      ).rejects.toThrow(`Saknar miljövariabel: ${name}`);
      expect(send).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
    });
  });
});

async function loadEmailRecipientFromEnv() {
  vi.resetModules();
  const { emailRecipientFromEnv } = await import("@/lib/email");
  return emailRecipientFromEnv;
}

describe("emailRecipientFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the trimmed address from the variable", async () => {
    vi.stubEnv("FEEDBACK_EMAIL_TO", "  team@example.com ");
    const emailRecipientFromEnv = await loadEmailRecipientFromEnv();

    expect(emailRecipientFromEnv("FEEDBACK_EMAIL_TO")).toBe("team@example.com");
  });

  it("returns a placeholder locally when emails are only printed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FEEDBACK_EMAIL_TO", "");
    const emailRecipientFromEnv = await loadEmailRecipientFromEnv();

    expect(emailRecipientFromEnv("FEEDBACK_EMAIL_TO")).toBe("(FEEDBACK_EMAIL_TO saknas)");
  });

  it("returns a placeholder when emails go to the outbox", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_OUTBOX_DIR", "/tmp/sjung-outbox-unused");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FEEDBACK_EMAIL_TO", "");
    const emailRecipientFromEnv = await loadEmailRecipientFromEnv();

    expect(emailRecipientFromEnv("FEEDBACK_EMAIL_TO")).toBe("(FEEDBACK_EMAIL_TO saknas)");
  });

  it("throws locally when emails are really sent", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("FEEDBACK_EMAIL_TO", "");
    const emailRecipientFromEnv = await loadEmailRecipientFromEnv();

    expect(() => emailRecipientFromEnv("FEEDBACK_EMAIL_TO")).toThrow("Saknar miljövariabel: FEEDBACK_EMAIL_TO");
  });

  it.each(["staging", "production"])("throws on %s when the variable is missing", async (appEnv) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", appEnv);
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("FEEDBACK_EMAIL_TO", "");
    const emailRecipientFromEnv = await loadEmailRecipientFromEnv();

    expect(() => emailRecipientFromEnv("FEEDBACK_EMAIL_TO")).toThrow("Saknar miljövariabel: FEEDBACK_EMAIL_TO");
  });
});
