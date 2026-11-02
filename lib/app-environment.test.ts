import { afterEach, describe, expect, it, vi } from "vitest";
import { appTitle, getAppEnvironment } from "@/lib/app-environment";

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
