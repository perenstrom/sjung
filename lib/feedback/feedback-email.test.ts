import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FeedbackEmail, type FeedbackEmailProps } from "@/lib/feedback/feedback-email";
import { renderMarkup, textOf } from "@/lib/testing/markup";

function emailText(versions: Pick<FeedbackEmailProps, "appVersion" | "serverAppVersion">): string {
  return textOf(
    renderMarkup(
      createElement(FeedbackEmail, {
        message: "Hej",
        sender: { name: "Anna", email: "anna@example.com" },
        pagePath: "/app/korus",
        groupSlug: "korus",
        environment: "staging",
        userAgent: "Firefox",
        ...versions,
      })
    )
  );
}

describe("FeedbackEmail", () => {
  it("shows one Version line when the browser and server run the same version", () => {
    const text = emailText({ appVersion: "0.2.0 · a1b2c3d", serverAppVersion: "0.2.0 · a1b2c3d" });

    expect(text).toContain("Version: 0.2.0 · a1b2c3d");
    expect(text).not.toContain("Version i webbläsaren");
    expect(text).not.toContain("Version på servern");
  });

  it.each([
    ["the browser runs an older version", "0.1.0", "0.1.0"],
    ["the browser didn't say", "", "(okänd)"],
  ])("shows both versions when %s", (_label, appVersion, shownInBrowserLine) => {
    const text = emailText({ appVersion, serverAppVersion: "0.2.0 · e4f5a6b" });

    expect(text).toContain(`Version i webbläsaren: ${shownInBrowserLine}`);
    expect(text).toContain("Version på servern: 0.2.0 · e4f5a6b");
    expect(text).not.toContain("Version:");
  });
});
