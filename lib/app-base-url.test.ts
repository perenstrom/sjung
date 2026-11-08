import { afterEach, describe, expect, it } from "vitest";
import { appUrl } from "@/lib/app-base-url";

const original = process.env.APP_BASE_URL;

afterEach(() => {
  process.env.APP_BASE_URL = original;
});

describe("appUrl", () => {
  it("builds an absolute URL on APP_BASE_URL", () => {
    process.env.APP_BASE_URL = "https://sjung.app";

    expect(appUrl("/auth/verify-email/confirm", { token: "a b" })).toBe(
      "https://sjung.app/auth/verify-email/confirm?token=a+b"
    );
  });

  it("ignores a trailing slash on APP_BASE_URL", () => {
    process.env.APP_BASE_URL = "https://staging.sjung.app/";

    expect(appUrl("/app")).toBe("https://staging.sjung.app/app");
  });

  it("throws when APP_BASE_URL is missing", () => {
    process.env.APP_BASE_URL = " ";

    expect(() => appUrl("/app")).toThrow("Saknar miljövariabel: APP_BASE_URL");
  });

  it("throws when APP_BASE_URL is not an http(s) origin", () => {
    process.env.APP_BASE_URL = "sjung.app";

    expect(() => appUrl("/app")).toThrow("Ogiltig APP_BASE_URL");
  });
});
