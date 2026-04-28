import { describe, expect, it } from "vitest";

import {
  isReservedGroupSlug,
  RESERVED_GROUP_SLUG,
  slugifyGroupName,
} from "@/lib/group-slug";

describe("slugifyGroupName", () => {
  it("normaliserar svenska tecken och skiljetecken", () => {
    expect(slugifyGroupName("Vår Kör 2026!")).toBe("var-kor-2026");
  });

  it("normaliserar flera separatorer till en bindestreckad slug", () => {
    expect(slugifyGroupName("  kör---rep / test  ")).toBe("kor-rep-test");
  });

  it('använder fallback "grupp" vid tomt eller ogiltigt innehåll', () => {
    expect(slugifyGroupName("   ")).toBe("grupp");
    expect(slugifyGroupName("!!!")).toBe("grupp");
  });
});

describe("isReservedGroupSlug", () => {
  it("identifierar reserverad slug", () => {
    expect(isReservedGroupSlug(RESERVED_GROUP_SLUG)).toBe(true);
    expect(isReservedGroupSlug("annan-grupp")).toBe(false);
  });
});
