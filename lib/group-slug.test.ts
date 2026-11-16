import { describe, expect, it } from "vitest";

import { isReservedGroupSlug, slugifyGroupName } from "@/lib/group-slug";

describe("slugifyGroupName", () => {
  it("normalizes Swedish characters and punctuation", () => {
    expect(slugifyGroupName("Vår Kör 2026!")).toBe("var-kor-2026");
  });

  it("normalizes multiple separators into a hyphenated slug", () => {
    expect(slugifyGroupName("  kör---rep / test  ")).toBe("kor-rep-test");
  });

  it('uses "grupp" as fallback for empty or invalid input', () => {
    expect(slugifyGroupName("   ")).toBe("grupp");
    expect(slugifyGroupName("!!!")).toBe("grupp");
  });
});

describe("isReservedGroupSlug", () => {
  it.each(["me", "news", "admin", "settings"])("reserves %s for the app", (slug) => {
    expect(isReservedGroupSlug(slug)).toBe(true);
  });

  it("reserves the slug a Group name turns into", () => {
    expect(isReservedGroupSlug(slugifyGroupName("  News! "))).toBe(true);
  });

  it.each(["annan-grupp", "news-2", "nyheter"])("leaves %s free for Groups", (slug) => {
    expect(isReservedGroupSlug(slug)).toBe(false);
  });
});
