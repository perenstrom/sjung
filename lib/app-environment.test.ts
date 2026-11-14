import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appIcons,
  appTitle,
  brandMarkSrc,
  getAppEnvironment,
} from "@/lib/app-environment";

describe("getAppEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is local in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "");

    expect(getAppEnvironment()).toBe("local");
  });

  it("is local in development even when APP_ENV says staging", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "staging");

    expect(getAppEnvironment()).toBe("local");
  });

  it("is staging when APP_ENV is staging", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "staging");

    expect(getAppEnvironment()).toBe("staging");
  });

  it("ignores surrounding whitespace in APP_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", " staging ");

    expect(getAppEnvironment()).toBe("staging");
  });

  it("is production when APP_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");

    expect(getAppEnvironment()).toBe("production");
  });

  it("is production when APP_ENV is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", undefined);

    expect(getAppEnvironment()).toBe("production");
  });

  it("is production when APP_ENV is an unknown value", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "qa");

    expect(getAppEnvironment()).toBe("production");
  });
});

describe("appTitle", () => {
  it("labels local titles", () => {
    expect(appTitle("local")).toEqual({
      default: "[local] Sjung",
      template: "[local] %s · Sjung",
    });
  });

  it("labels staging titles", () => {
    expect(appTitle("staging")).toEqual({
      default: "[staging] Sjung",
      template: "[staging] %s · Sjung",
    });
  });

  it("leaves production titles unlabelled", () => {
    expect(appTitle("production")).toEqual({
      default: "Sjung",
      template: "%s · Sjung",
    });
  });
});

describe("appIcons", () => {
  it("uses the production icons in production", () => {
    expect(appIcons("production")).toEqual({
      icon: [
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
        { url: "/icons/production/icon.svg", type: "image/svg+xml" },
      ],
      apple: "/icons/production/apple-icon.png",
    });
  });

  it.each(["staging", "local"] as const)(
    "uses the staging icons on %s",
    (environment) => {
      expect(appIcons(environment)).toEqual({
        icon: [
          { url: "/icons/staging/favicon.ico", sizes: "16x16 32x32 48x48" },
          { url: "/icons/staging/icon.svg", type: "image/svg+xml" },
        ],
        apple: "/icons/staging/apple-icon.png",
      });
    },
  );
});

describe("brandMarkSrc", () => {
  it("matches the production SVG favicon", () => {
    const productionSvg = appIcons("production").icon.find(
      (icon) => icon.type === "image/svg+xml",
    );

    expect(brandMarkSrc).toBe(productionSvg?.url);
  });
});
