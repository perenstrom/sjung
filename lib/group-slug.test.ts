import { describe, expect, it } from "vitest";

import {
  isReservedGroupSlug,
  RESERVED_GROUP_SLUG,
  slugifyGroupName,
} from "@/lib/group-slug";

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
  it("identifies reserved slugs", () => {
    expect(isReservedGroupSlug(RESERVED_GROUP_SLUG)).toBe(true);
    expect(isReservedGroupSlug("annan-grupp")).toBe(false);
  });
});
