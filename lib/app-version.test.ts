import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "@/package.json";
import { appVersion } from "@/lib/app-version";

const { version } = packageJson;
const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

describe("appVersion", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["production, without a commit", "production", undefined, version],
    ["production, even with a commit", "production", SHA, version],
    ["staging, with the short commit", "staging", SHA, `${version} · a1b2c3d`],
    ["staging, without a commit", "staging", undefined, version],
    ["staging, with a blank commit", "staging", "  ", version],
  ])("is the version on %s", (_label, appEnv, commit, expected) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", appEnv);
    vi.stubEnv("APP_COMMIT", commit);

    expect(appVersion()).toBe(expected);
  });

  it("marks a local build as lokal, whatever the commit", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_COMMIT", SHA);

    expect(appVersion()).toBe(`${version} · lokal`);
  });
});
